import { Response } from 'express';
import { asyncHandler } from '@utils/async-handler.util';
import { ResponseUtil } from '@utils/response.util';
import { assignmentService } from '@services';
import { HTTP_STATUS, MESSAGE_KEYS } from '@shared/constants';
import { ReviewerRequest } from '@shared/types';

export class AssignmentController {
  private static instance: AssignmentController;
  static getInstance(): AssignmentController {
    if (!this.instance) this.instance = new AssignmentController();
    return this.instance;
  }

  create = asyncHandler(async (req: ReviewerRequest, res: Response) => {
    const result = await assignmentService.create(req.reviewerId!, req.body);
    if (!result.success) return ResponseUtil.error(res, result.messageKey!, HTTP_STATUS.BAD_REQUEST);
    return ResponseUtil.created(res, result.data, result.messageKey!);
  });

  list = asyncHandler(async (req: ReviewerRequest, res: Response) => {
    const result = await assignmentService.listForReviewer(req.reviewerId!);
    if (!result.success) return ResponseUtil.error(res, result.messageKey!);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  getOne = asyncHandler(async (req: ReviewerRequest, res: Response) => {
    const result = await assignmentService.getOwned(req.reviewerId!, req.params.id);
    if (!result.success) return ResponseUtil.notFound(res, result.messageKey!);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  update = asyncHandler(async (req: ReviewerRequest, res: Response) => {
    const result = await assignmentService.update(req.reviewerId!, req.params.id, req.body);
    if (!result.success) {
      const status =
        result.messageKey === MESSAGE_KEYS.ASSIGNMENT_NOT_FOUND
          ? HTTP_STATUS.NOT_FOUND
          : result.messageKey === MESSAGE_KEYS.ASSIGNMENT_LOCKED
            ? HTTP_STATUS.CONFLICT
            : HTTP_STATUS.BAD_REQUEST;
      return ResponseUtil.error(res, result.messageKey!, status);
    }
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  remove = asyncHandler(async (req: ReviewerRequest, res: Response) => {
    const result = await assignmentService.delete(req.reviewerId!, req.params.id);
    if (!result.success) {
      const status =
        result.messageKey === MESSAGE_KEYS.ASSIGNMENT_NOT_FOUND
          ? HTTP_STATUS.NOT_FOUND
          : result.messageKey === MESSAGE_KEYS.ASSIGNMENT_LOCKED
            ? HTTP_STATUS.CONFLICT
            : HTTP_STATUS.BAD_REQUEST;
      return ResponseUtil.error(res, result.messageKey!, status);
    }
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  assign = asyncHandler(async (req: ReviewerRequest, res: Response) => {
    const result = await assignmentService.assignToCandidate(req.reviewerId!, req.params.id, req.body);
    if (!result.success) return ResponseUtil.error(res, result.messageKey!, HTTP_STATUS.BAD_REQUEST);
    return ResponseUtil.created(res, result.data, result.messageKey!);
  });

  bulkAssign = asyncHandler(async (req: ReviewerRequest, res: Response) => {
    const result = await assignmentService.bulkAssign(req.reviewerId!, req.body);
    if (!result.success) return ResponseUtil.error(res, result.messageKey!, HTTP_STATUS.BAD_REQUEST);
    return ResponseUtil.created(res, result.data, result.messageKey!);
  });

  listInstances = asyncHandler(async (req: ReviewerRequest, res: Response) => {
    const { candidateId, status } = req.query as Record<string, string | undefined>;
    const result = await assignmentService.listInstancesForReviewer(req.reviewerId!, { candidateId, status });
    if (!result.success) return ResponseUtil.error(res, result.messageKey!);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  updateInstanceDeadline = asyncHandler(async (req: ReviewerRequest, res: Response) => {
    const result = await assignmentService.updateInstanceDeadline(req.reviewerId!, req.params.id, req.body);
    if (!result.success) {
      const status =
        result.messageKey === MESSAGE_KEYS.INSTANCE_NOT_FOUND
          ? HTTP_STATUS.NOT_FOUND
          : result.messageKey === MESSAGE_KEYS.INSTANCE_NOT_EDITABLE
            ? HTTP_STATUS.CONFLICT
            : HTTP_STATUS.BAD_REQUEST;
      return ResponseUtil.error(res, result.messageKey!, status);
    }
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  deleteInstance = asyncHandler(async (req: ReviewerRequest, res: Response) => {
    // ?force=true is the explicit opt-in for removing a scored instance
    // (which also removes the score). Any other truthy value is treated as
    // false — we want a literal, intentional opt-in.
    const force = req.query.force === 'true';
    const result = await assignmentService.deleteInstance(req.reviewerId!, req.params.id, { force });
    if (!result.success) {
      const status =
        result.messageKey === MESSAGE_KEYS.INSTANCE_NOT_FOUND
          ? HTTP_STATUS.NOT_FOUND
          : result.messageKey === MESSAGE_KEYS.INSTANCE_IN_PROGRESS_BLOCKED ||
              result.messageKey === MESSAGE_KEYS.INSTANCE_SCORED_NEEDS_FORCE
            ? HTTP_STATUS.CONFLICT
            : HTTP_STATUS.BAD_REQUEST;
      return ResponseUtil.error(res, result.messageKey!, status);
    }
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });
}

export const assignmentController = AssignmentController.getInstance();
