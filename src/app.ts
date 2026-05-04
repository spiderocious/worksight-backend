import express, { Application, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import routes from '@routes';
import { ResponseUtil } from '@utils/response.util';
import { logger } from '@utils/logger.util';
import { MESSAGE_KEYS } from '@shared/constants';

export const createApp = (): Application => {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '2mb' }));

  // api request logger
  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.info(`Incoming request: ${req.method} ${req.path}`);
    next();
  });

  app.use('/api', routes);

  app.use((req: Request, res: Response) => {
    ResponseUtil.notFound(res, MESSAGE_KEYS.NOT_FOUND);
    void req;
  });
  

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Uncaught Express error', err);
    if (!res.headersSent) ResponseUtil.error(res, MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
  });

  return app;
};
