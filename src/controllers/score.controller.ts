import { Response } from 'express';
import { asyncHandler } from '@utils/async-handler.util';
import { ResponseUtil } from '@utils/response.util';
import { scoreService } from '@services';
import { HTTP_STATUS } from '@shared/constants';
import { ReviewerRequest } from '@shared/types';

export class ScoreController {
  private static instance: ScoreController;
  static getInstance(): ScoreController {
    if (!this.instance) this.instance = new ScoreController();
    return this.instance;
  }

  upsert = asyncHandler(async (req: ReviewerRequest, res: Response) => {
    const result = await scoreService.create(req.reviewerId!, req.params.id, req.body);
    if (!result.success) return ResponseUtil.error(res, result.messageKey!, HTTP_STATUS.BAD_REQUEST);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  get = asyncHandler(async (req: ReviewerRequest, res: Response) => {
    const result = await scoreService.getForSession(req.reviewerId!, req.params.id);
    if (!result.success) return ResponseUtil.notFound(res, result.messageKey!);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  history = asyncHandler(async (req: ReviewerRequest, res: Response) => {
    const result = await scoreService.candidateHistory(req.reviewerId!, req.params.candidateId);
    if (!result.success) return ResponseUtil.error(res, result.messageKey!);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });
}

export const scoreController = ScoreController.getInstance();
