import { Response } from 'express';
import { asyncHandler } from '@utils/async-handler.util';
import { ResponseUtil } from '@utils/response.util';
import { candidatePortalService } from '@services';
import { CandidateRequest } from '@shared/types';

export class CandidatePortalController {
  private static instance: CandidatePortalController;
  static getInstance(): CandidatePortalController {
    if (!this.instance) this.instance = new CandidatePortalController();
    return this.instance;
  }

  me = asyncHandler(async (req: CandidateRequest, res: Response) => {
    const result = await candidatePortalService.dashboard(req.candidateId!);
    if (!result.success) return ResponseUtil.error(res, result.messageKey!);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  instance = asyncHandler(async (req: CandidateRequest, res: Response) => {
    const result = await candidatePortalService.getInstance(req.candidateId!, req.params.instanceId);
    if (!result.success) return ResponseUtil.notFound(res, result.messageKey!);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });
}

export const candidatePortalController = CandidatePortalController.getInstance();
