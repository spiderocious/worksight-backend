import jwt, { SignOptions } from 'jsonwebtoken';
import { AdminJwtPayload, CandidateJwtPayload, ReviewerJwtPayload } from '@shared/types';
import { env } from '@configs/env';

type AnyPayload = ReviewerJwtPayload | CandidateJwtPayload | AdminJwtPayload;

export const JWTUtil = {
  signReviewer(payload: ReviewerJwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as SignOptions);
  },
  signCandidate(payload: CandidateJwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.CANDIDATE_TOKEN_EXPIRES_IN } as SignOptions);
  },
  signAdmin(payload: AdminJwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as SignOptions);
  },
  verify<T extends AnyPayload>(token: string): T | null {
    try {
      return jwt.verify(token, env.JWT_SECRET) as T;
    } catch {
      return null;
    }
  },
};
