import { Request, Response } from 'express';
import { asyncHandler } from '@utils/async-handler.util';
import { ResponseUtil } from '@utils/response.util';
import { reviewerService } from '@services';
import { HTTP_STATUS, MESSAGE_KEYS } from '@shared/constants';
import { ReviewerRequest } from '@shared/types';

export class ReviewerController {
  private static instance: ReviewerController;
  static getInstance(): ReviewerController {
    if (!this.instance) this.instance = new ReviewerController();
    return this.instance;
  }

  signup = asyncHandler(async (req: Request, res: Response) => {
    const result = await reviewerService.signup(req.body);
    if (!result.success) return ResponseUtil.error(res, result.messageKey!, HTTP_STATUS.BAD_REQUEST);
    return ResponseUtil.created(res, result.data, result.messageKey!);
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const result = await reviewerService.login(req.body);
    if (!result.success)
      return ResponseUtil.error(
        res,
        result.messageKey!,
        result.messageKey === MESSAGE_KEYS.INVALID_CREDENTIALS ? HTTP_STATUS.UNAUTHORIZED : HTTP_STATUS.BAD_REQUEST
      );
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  me = asyncHandler(async (req: ReviewerRequest, res: Response) => {
    const result = await reviewerService.getById(req.reviewerId!);
    if (!result.success) return ResponseUtil.notFound(res, result.messageKey!);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  updateMe = asyncHandler(async (req: ReviewerRequest, res: Response) => {
    const result = await reviewerService.update(req.reviewerId!, req.body);
    if (!result.success) return ResponseUtil.error(res, result.messageKey!, HTTP_STATUS.BAD_REQUEST);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  updatePassword = asyncHandler(async (req: ReviewerRequest, res: Response) => {
    const result = await reviewerService.updatePassword(req.reviewerId!, req.body);
    if (!result.success) return ResponseUtil.error(res, result.messageKey!, HTTP_STATUS.BAD_REQUEST);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });
}

export const reviewerController = ReviewerController.getInstance();
