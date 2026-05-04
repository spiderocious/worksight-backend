import { Response } from 'express';
import { asyncHandler } from '@utils/async-handler.util';
import { ResponseUtil } from '@utils/response.util';
import { sessionService } from '@services';
import { HTTP_STATUS, MESSAGE_KEYS } from '@shared/constants';
import { CandidateRequest, ReviewerRequest } from '@shared/types';

const errStatus = (key?: string): number => {
  switch (key) {
    case MESSAGE_KEYS.SESSION_NOT_FOUND:
    case MESSAGE_KEYS.INSTANCE_NOT_FOUND:
    case MESSAGE_KEYS.ASSIGNMENT_NOT_FOUND:
    case MESSAGE_KEYS.CANDIDATE_NOT_FOUND:
      return HTTP_STATUS.NOT_FOUND;
    case MESSAGE_KEYS.SESSION_ALREADY_ACTIVE:
      return HTTP_STATUS.CONFLICT;
    case MESSAGE_KEYS.SESSION_EXPIRED:
    case MESSAGE_KEYS.SESSION_NOT_ACTIVE:
    case MESSAGE_KEYS.INSTANCE_NOT_PENDING:
      return HTTP_STATUS.CONFLICT;
    case MESSAGE_KEYS.CANDIDATE_INACTIVE:
      return HTTP_STATUS.FORBIDDEN;
    default:
      return HTTP_STATUS.BAD_REQUEST;
  }
};

export class SessionController {
  private static instance: SessionController;
  static getInstance(): SessionController {
    if (!this.instance) this.instance = new SessionController();
    return this.instance;
  }

  start = asyncHandler(async (req: CandidateRequest, res: Response) => {
    const result = await sessionService.start(req.candidateId!, req.body);
    if (!result.success) return ResponseUtil.error(res, result.messageKey!, errStatus(result.messageKey));
    return ResponseUtil.created(res, result.data, result.messageKey!);
  });

  screenshot = asyncHandler(async (req: CandidateRequest, res: Response) => {
    const result = await sessionService.registerScreenshot(req.candidateId!, req.params.id, req.body);
    if (!result.success) return ResponseUtil.error(res, result.messageKey!, errStatus(result.messageKey));
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  submit = asyncHandler(async (req: CandidateRequest, res: Response) => {
    const result = await sessionService.submit(req.candidateId!, req.params.id, req.body);
    if (!result.success) return ResponseUtil.error(res, result.messageKey!, errStatus(result.messageKey));
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  reportAbnormal = asyncHandler(async (req: CandidateRequest, res: Response) => {
    const result = await sessionService.reportAbnormal(req.candidateId!, req.params.id);
    if (!result.success) return ResponseUtil.error(res, result.messageKey!, errStatus(result.messageKey));
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  getCandidate = asyncHandler(async (req: CandidateRequest, res: Response) => {
    const result = await sessionService.getOwnedSession(req.candidateId!, req.params.id);
    if (!result.success) return ResponseUtil.notFound(res, result.messageKey!);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  getReviewer = asyncHandler(async (req: ReviewerRequest, res: Response) => {
    const result = await sessionService.getReviewerSession(req.reviewerId!, req.params.id);
    if (!result.success) return ResponseUtil.notFound(res, result.messageKey!);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });
}

export const sessionController = SessionController.getInstance();
