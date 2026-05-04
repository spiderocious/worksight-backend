import { NextFunction, Response } from 'express';
import { ResponseUtil } from '@utils/response.util';
import { JWTUtil } from '@utils/jwt.util';
import {
  AdminJwtPayload,
  AdminRequest,
  CandidateRequest,
  ReviewerRequest,
  ReviewerJwtPayload,
  CandidateJwtPayload,
} from '@shared/types';
import { MESSAGE_KEYS } from '@shared/constants';

const extract = (header?: string): string | null => {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
};

export const requireReviewer = (req: ReviewerRequest, res: Response, next: NextFunction): void => {
  const token = extract(req.headers.authorization);
  if (!token) {
    ResponseUtil.unauthorized(res);
    return;
  }
  const payload = JWTUtil.verify<ReviewerJwtPayload>(token);
  if (!payload || payload.type !== 'reviewer') {
    ResponseUtil.unauthorized(res);
    return;
  }
  req.reviewerId = payload.reviewerId;
  next();
};

export const requireCandidate = (req: CandidateRequest, res: Response, next: NextFunction): void => {
  const token = extract(req.headers.authorization);
  if (!token) {
    ResponseUtil.unauthorized(res);
    return;
  }
  const payload = JWTUtil.verify<CandidateJwtPayload>(token);
  if (!payload || payload.type !== 'candidate') {
    ResponseUtil.unauthorized(res);
    return;
  }
  req.candidateId = payload.candidateId;
  next();
};

export const requireAdmin = (req: AdminRequest, res: Response, next: NextFunction): void => {
  const token = extract(req.headers.authorization);
  if (!token) {
    ResponseUtil.unauthorized(res);
    return;
  }
  const payload = JWTUtil.verify<AdminJwtPayload>(token);
  if (!payload || payload.type !== 'admin') {
    ResponseUtil.unauthorized(res);
    return;
  }
  req.adminId = payload.adminId;
  next();
};

void MESSAGE_KEYS;
