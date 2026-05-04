import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import {
  AdminModel,
  AssignmentInstanceModel,
  CandidateModel,
  ReviewerModel,
  ScoreModel,
  SessionModel,
} from '@models';
import { ServiceError, ServiceResult, ServiceSuccess } from '@shared/types';
import { MESSAGE_KEYS } from '@shared/constants';
import { generateId, JWTUtil, logger } from '@utils';
import { AdminLoginDTO } from '@requests/admin.requests';

interface AdminPublic {
  id: string;
  email: string;
  createdAt: Date;
}

interface BootstrapResult {
  email: string;
  password: string; // plain text, returned exactly once
  id: string;
}

interface AuthResponse {
  token: string;
  admin: AdminPublic;
}

interface AdminStats {
  reviewerCount: number;
  candidateCount: number;
  activeCandidateCount: number;
  assignmentInstanceCount: number;
  sessionCount: number;
  scoredSessionCount: number;
}

const sanitize = (a: { id: string; email: string; createdAt: Date }): AdminPublic => ({
  id: a.id,
  email: a.email,
  createdAt: a.createdAt,
});

// Generate a 16-char password from URL-safe characters. Avoid look-alike chars
// (0/O, 1/l/I) so the operator can copy-paste reliably.
const generatePassword = (): string => {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$';
  const buf = crypto.randomBytes(16);
  let out = '';
  for (let i = 0; i < 16; i++) out += alphabet[buf[i] % alphabet.length];
  return out;
};

const generateEmail = (): string => {
  const suffix = crypto.randomBytes(4).toString('hex');
  return `admin-${suffix}@worksight.local`;
};

export class AdminService {
  private static instance: AdminService;
  private constructor() {}
  static getInstance(): AdminService {
    if (!this.instance) this.instance = new AdminService();
    return this.instance;
  }

  /**
   * One-shot bootstrap. If no Admin exists, generate random creds, persist,
   * and return them in plain text. If one already exists, refuse.
   *
   * There is no way to retrieve the password later — if you lose it, delete
   * the admin doc in Mongo and call this again.
   */
  async bootstrap(): Promise<ServiceResult<BootstrapResult>> {
    try {
      const existing = await AdminModel.exists({});
      if (existing) {
        return new ServiceError('Already exists', MESSAGE_KEYS.ADMIN_ALREADY_EXISTS);
      }
      const email = generateEmail();
      const password = generatePassword();
      const hashed = await bcrypt.hash(password, 10);
      const id = generateId(16, 'ad');
      await AdminModel.create({ id, email, password: hashed });
      logger.info('Admin bootstrapped', { id, email });
      return new ServiceSuccess({ id, email, password }, MESSAGE_KEYS.ADMIN_CREATED);
    } catch (err) {
      logger.error('Admin bootstrap failed', err);
      return new ServiceError('Bootstrap failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async login(dto: AdminLoginDTO): Promise<ServiceResult<AuthResponse>> {
    try {
      const admin = await AdminModel.findOne({ email: dto.email }).select('+password').lean();
      if (!admin) return new ServiceError('Invalid', MESSAGE_KEYS.ADMIN_INVALID_CREDENTIALS);
      const ok = await bcrypt.compare(dto.password, admin.password);
      if (!ok) return new ServiceError('Invalid', MESSAGE_KEYS.ADMIN_INVALID_CREDENTIALS);
      const token = JWTUtil.signAdmin({ adminId: admin.id, type: 'admin' });
      return new ServiceSuccess({ token, admin: sanitize(admin) }, MESSAGE_KEYS.ADMIN_LOGGED_IN);
    } catch (err) {
      logger.error('Admin login failed', err);
      return new ServiceError('Login failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async getById(id: string): Promise<ServiceResult<AdminPublic>> {
    try {
      const admin = await AdminModel.findOne({ id }).lean();
      if (!admin) return new ServiceError('Not found', MESSAGE_KEYS.NOT_FOUND);
      return new ServiceSuccess(sanitize(admin), MESSAGE_KEYS.ADMIN_FETCHED);
    } catch (err) {
      logger.error('Admin fetch failed', err);
      return new ServiceError('Fetch failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async stats(): Promise<ServiceResult<AdminStats>> {
    try {
      const [
        reviewerCount,
        candidateCount,
        activeCandidateCount,
        assignmentInstanceCount,
        sessionCount,
        scoredSessionCount,
      ] = await Promise.all([
        ReviewerModel.countDocuments(),
        CandidateModel.countDocuments(),
        CandidateModel.countDocuments({ isActive: true }),
        AssignmentInstanceModel.countDocuments(),
        SessionModel.countDocuments(),
        ScoreModel.countDocuments(),
      ]);
      return new ServiceSuccess(
        {
          reviewerCount,
          candidateCount,
          activeCandidateCount,
          assignmentInstanceCount,
          sessionCount,
          scoredSessionCount,
        },
        MESSAGE_KEYS.STATS_FETCHED
      );
    } catch (err) {
      logger.error('Admin stats failed', err);
      return new ServiceError('Stats failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async listReviewers(page: number, limit: number): Promise<
    ServiceResult<{ items: unknown[]; total: number; page: number; limit: number }>
  > {
    try {
      const skip = (page - 1) * limit;
      const [items, total] = await Promise.all([
        ReviewerModel.find()
          .select('-password')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ReviewerModel.countDocuments(),
      ]);
      return new ServiceSuccess({ items, total, page, limit }, MESSAGE_KEYS.USERS_FETCHED);
    } catch (err) {
      logger.error('Admin list reviewers failed', err);
      return new ServiceError('List failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async listCandidates(page: number, limit: number): Promise<
    ServiceResult<{ items: unknown[]; total: number; page: number; limit: number }>
  > {
    try {
      const skip = (page - 1) * limit;
      const [items, total] = await Promise.all([
        CandidateModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        CandidateModel.countDocuments(),
      ]);
      return new ServiceSuccess({ items, total, page, limit }, MESSAGE_KEYS.USERS_FETCHED);
    } catch (err) {
      logger.error('Admin list candidates failed', err);
      return new ServiceError('List failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }
}

export const adminService = AdminService.getInstance();
