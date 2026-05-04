import { Request } from 'express';

export interface ReviewerJwtPayload {
  reviewerId: string;
  type: 'reviewer';
}

export interface CandidateJwtPayload {
  candidateId: string;
  type: 'candidate';
}

export interface AdminJwtPayload {
  adminId: string;
  type: 'admin';
}

export interface ReviewerRequest extends Request {
  reviewerId?: string;
}

export interface CandidateRequest extends Request {
  candidateId?: string;
}

export interface AdminRequest extends Request {
  adminId?: string;
}
