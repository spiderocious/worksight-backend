import { Response } from 'express';
import { asyncHandler } from '@utils/async-handler.util';
import { ResponseUtil } from '@utils/response.util';
import { sessionRuleService } from '@services';
import { HTTP_STATUS, MESSAGE_KEYS } from '@shared/constants';
import { CandidateRequest, ReviewerRequest } from '@shared/types';
import { CandidateModel } from '@models';

export class SessionRuleController {
  private static instance: SessionRuleController;
  static getInstance(): SessionRuleController {
    if (!this.instance) this.instance = new SessionRuleController();
    return this.instance;
  }

  // Reviewer-side: list everything (active + inactive).
  list = asyncHandler(async (req: ReviewerRequest, res: Response) => {
    const result = await sessionRuleService.listAllForReviewer(req.reviewerId!);
    if (!result.success) return ResponseUtil.error(res, result.messageKey!);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  create = asyncHandler(async (req: ReviewerRequest, res: Response) => {
    const result = await sessionRuleService.create(req.reviewerId!, req.body);
    if (!result.success) return ResponseUtil.error(res, result.messageKey!, HTTP_STATUS.BAD_REQUEST);
    return ResponseUtil.created(res, result.data, result.messageKey!);
  });

  update = asyncHandler(async (req: ReviewerRequest, res: Response) => {
    const result = await sessionRuleService.update(req.reviewerId!, req.params.id, req.body);
    if (!result.success) {
      const status =
        result.messageKey === MESSAGE_KEYS.RULE_NOT_FOUND
          ? HTTP_STATUS.NOT_FOUND
          : HTTP_STATUS.BAD_REQUEST;
      return ResponseUtil.error(res, result.messageKey!, status);
    }
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  remove = asyncHandler(async (req: ReviewerRequest, res: Response) => {
    const result = await sessionRuleService.delete(req.reviewerId!, req.params.id);
    if (!result.success) return ResponseUtil.notFound(res, result.messageKey!);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  // Candidate-side: only active rules belonging to the candidate's reviewer.
  forCandidate = asyncHandler(async (req: CandidateRequest, res: Response) => {
    const candidate = await CandidateModel.findOne({ id: req.candidateId }).lean();
    if (!candidate) return ResponseUtil.notFound(res, MESSAGE_KEYS.CANDIDATE_NOT_FOUND);
    const result = await sessionRuleService.listActiveForCandidate(candidate.reviewerId);
    if (!result.success) return ResponseUtil.error(res, result.messageKey!);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });
}

export const sessionRuleController = SessionRuleController.getInstance();
