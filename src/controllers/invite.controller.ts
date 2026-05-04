import { Request, Response } from 'express';
import { asyncHandler } from '@utils/async-handler.util';
import { ResponseUtil } from '@utils/response.util';
import { inviteService } from '@services';

export class InviteController {
  private static instance: InviteController;
  static getInstance(): InviteController {
    if (!this.instance) this.instance = new InviteController();
    return this.instance;
  }

  // Public — accepts the candidate's access code, returns the personalized
  // invite payload used by the /candidate/invite/:code marketing page.
  resolve = asyncHandler(async (req: Request, res: Response) => {
    const code = (req.params.code ?? '').trim().toUpperCase();
    if (!code || code.length !== 10) {
      return ResponseUtil.notFound(res);
    }
    const result = await inviteService.resolve(code);
    if (!result.success) return ResponseUtil.notFound(res, result.messageKey!);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });
}

export const inviteController = InviteController.getInstance();
