import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '@utils/logger.util';

export const connectDB = async (): Promise<void> => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGO_URI);
  logger.info('MongoDB connected', { uri: env.MONGO_URI });
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
};
