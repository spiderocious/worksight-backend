import { NextFunction, Request, Response } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ResponseUtil } from '@utils/response.util';
import { MESSAGE_KEYS } from '@shared/constants';

type Source = 'body' | 'query' | 'params';

export const validate = (schema: ZodSchema, source: Source = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[source]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any)[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const issues = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
        ResponseUtil.badRequest(res, MESSAGE_KEYS.VALIDATION_ERROR, issues);
        return;
      }
      ResponseUtil.badRequest(res, MESSAGE_KEYS.VALIDATION_ERROR);
    }
  };
};
