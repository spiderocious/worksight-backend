import { Response } from 'express';
import { asyncHandler } from '@utils/async-handler.util';
import { ResponseUtil } from '@utils/response.util';
import { reviewerSettingsService } from '@services';
import { HTTP_STATUS, MESSAGE_KEYS } from '@shared/constants';
import { CandidateRequest, ReviewerRequest } from '@shared/types';
import { CandidateModel } from '@models';

export class ReviewerSettingsController {
  private static instance: ReviewerSettingsController;
  static getInstance(): ReviewerSettingsController {
    if (!this.instance) this.instance = new ReviewerSettingsController();
    return this.instance;
  }

  get = asyncHandler(async (req: ReviewerRequest, res: Response) => {
    const result = await reviewerSettingsService.get(req.reviewerId!);
    if (!result.success) return ResponseUtil.error(res, result.messageKey!);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  update = asyncHandler(async (req: ReviewerRequest, res: Response) => {
    const result = await reviewerSettingsService.update(req.reviewerId!, req.body);
    if (!result.success) return ResponseUtil.error(res, result.messageKey!, HTTP_STATUS.BAD_REQUEST);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  // Candidate-side: subset of settings the Electron app needs.
  forCandidate = asyncHandler(async (req: CandidateRequest, res: Response) => {
    const candidate = await CandidateModel.findOne({ id: req.candidateId }).lean();
    if (!candidate) return ResponseUtil.notFound(res, MESSAGE_KEYS.CANDIDATE_NOT_FOUND);
    const result = await reviewerSettingsService.getForCandidate(candidate.reviewerId);
    if (!result.success) return ResponseUtil.error(res, result.messageKey!);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });
}

export const reviewerSettingsController = ReviewerSettingsController.getInstance();
