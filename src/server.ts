import { createApp } from './app';
import { connectDB, disconnectDB, env } from '@configs';
import { blocklistService, sessionService } from '@services';
import { logger } from '@utils';

const SWEEP_INTERVAL_MS = 30 * 1000;

const main = async () => {
  await connectDB();
  await blocklistService.ensureSeeded();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`WorkSight backend listening on http://localhost:${env.PORT}`);
  });

  const sweep = setInterval(() => {
    sessionService.sweepAll().catch((err) => logger.error('Sweep failed', err));
  }, SWEEP_INTERVAL_MS);

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down`);
    clearInterval(sweep);
    server.close(() => logger.info('HTTP server closed'));
    await disconnectDB();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

main().catch((err) => {
  logger.error('Fatal startup error', err);
  process.exit(1);
});
