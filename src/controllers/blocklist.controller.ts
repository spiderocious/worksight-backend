import { Request, Response } from 'express';
import { asyncHandler } from '@utils/async-handler.util';
import { ResponseUtil } from '@utils/response.util';
import { blocklistService } from '@services';

export class BlocklistController {
  private static instance: BlocklistController;
  static getInstance(): BlocklistController {
    if (!this.instance) this.instance = new BlocklistController();
    return this.instance;
  }

  get = asyncHandler(async (_req: Request, res: Response) => {
    const result = await blocklistService.get();
    if (!result.success) return ResponseUtil.error(res, result.messageKey!);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });
}

export const blocklistController = BlocklistController.getInstance();
