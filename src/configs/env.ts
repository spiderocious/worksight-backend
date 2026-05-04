import dotenv from 'dotenv';
dotenv.config();

const required = (name: string, fallback?: string): string => {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
};

export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  MONGO_URI: required('MONGO_URI', 'mongodb://127.0.0.1:27017/worksight'),
  JWT_SECRET: required('JWT_SECRET', 'worksight-dev-secret-change-me'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',
  CANDIDATE_TOKEN_EXPIRES_IN: process.env.CANDIDATE_TOKEN_EXPIRES_IN ?? '30d',
};
