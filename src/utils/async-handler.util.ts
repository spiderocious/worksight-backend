import { NextFunction, Request, Response } from 'express';
import { logger } from './logger.util';
import { ResponseUtil } from './response.util';
import { MESSAGE_KEYS } from '@shared/constants';

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown;

export const asyncHandler = (handler: Handler) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await handler(req, res, next);
    } catch (err) {
      logger.error('Unhandled controller error', err);
      if (!res.headersSent) {
        ResponseUtil.error(res, MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
      }
    }
  };
};
