import { Request, Response } from 'express';
import { asyncHandler } from '@utils/async-handler.util';
import { ResponseUtil } from '@utils/response.util';
import { candidateService } from '@services';
import { HTTP_STATUS, MESSAGE_KEYS } from '@shared/constants';
import { ReviewerRequest } from '@shared/types';

export class CandidateController {
  private static instance: CandidateController;
  static getInstance(): CandidateController {
    if (!this.instance) this.instance = new CandidateController();
    return this.instance;
  }

  create = asyncHandler(async (req: ReviewerRequest, res: Response) => {
    const result = await candidateService.create(req.reviewerId!, req.body);
    if (!result.success) return ResponseUtil.error(res, result.messageKey!, HTTP_STATUS.BAD_REQUEST);
    return ResponseUtil.created(res, result.data, result.messageKey!);
  });

  list = asyncHandler(async (req: ReviewerRequest, res: Response) => {
    const result = await candidateService.listForReviewer(req.reviewerId!);
    if (!result.success) return ResponseUtil.error(res, result.messageKey!);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  getOne = asyncHandler(async (req: ReviewerRequest, res: Response) => {
    const result = await candidateService.getOwned(req.reviewerId!, req.params.id);
    if (!result.success) return ResponseUtil.notFound(res, result.messageKey!);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  update = asyncHandler(async (req: ReviewerRequest, res: Response) => {
    const result = await candidateService.update(req.reviewerId!, req.params.id, req.body);
    if (!result.success)
      return ResponseUtil.error(
        res,
        result.messageKey!,
        result.messageKey === MESSAGE_KEYS.CANDIDATE_NOT_FOUND ? HTTP_STATUS.NOT_FOUND : HTTP_STATUS.BAD_REQUEST
      );
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  deactivate = asyncHandler(async (req: ReviewerRequest, res: Response) => {
    const result = await candidateService.deactivate(req.reviewerId!, req.params.id);
    if (!result.success) return ResponseUtil.notFound(res, result.messageKey!);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  regenerate = asyncHandler(async (req: ReviewerRequest, res: Response) => {
    const result = await candidateService.regenerateCode(req.reviewerId!, req.params.id);
    if (!result.success) return ResponseUtil.notFound(res, result.messageKey!);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  exchange = asyncHandler(async (req: Request, res: Response) => {
    const result = await candidateService.exchangeCode(req.body);
    if (!result.success) return ResponseUtil.unauthorized(res, result.messageKey!);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });
}

export const candidateController = CandidateController.getInstance();
