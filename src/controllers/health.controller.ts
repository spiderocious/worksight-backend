import { Request, Response } from 'express';
import { asyncHandler } from '@utils/async-handler.util';
import { ResponseUtil } from '@utils/response.util';
import { MESSAGE_KEYS } from '@shared/constants';

export const healthController = {
  ping: asyncHandler(async (_req: Request, res: Response) => {
    return ResponseUtil.success(res, { ok: true, ts: new Date().toISOString() }, MESSAGE_KEYS.SUCCESS);
  }),
};
