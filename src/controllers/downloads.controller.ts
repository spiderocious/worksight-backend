import { Request, Response } from 'express';
import { asyncHandler } from '@utils/async-handler.util';
import { ResponseUtil } from '@utils/response.util';
import { downloadsService } from '@services';

export class DownloadsController {
  private static instance: DownloadsController;
  static getInstance(): DownloadsController {
    if (!this.instance) this.instance = new DownloadsController();
    return this.instance;
  }

  get = asyncHandler(async (_req: Request, res: Response) => {
    const result = await downloadsService.get();
    if (!result.success) return ResponseUtil.error(res, result.messageKey!);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });
}

export const downloadsController = DownloadsController.getInstance();
