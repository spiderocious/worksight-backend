import bcrypt from 'bcryptjs';
import { ReviewerModel } from '@models';
import { ServiceError, ServiceResult, ServiceSuccess } from '@shared/types';
import { MESSAGE_KEYS } from '@shared/constants';
import { generateId, JWTUtil, logger } from '@utils';
import {
  ReviewerLoginDTO,
  ReviewerPasswordDTO,
  ReviewerSignupDTO,
  ReviewerUpdateDTO,
} from '@requests/reviewer.requests';

interface PublicReviewer {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

interface AuthResponse {
  token: string;
  reviewer: PublicReviewer;
}

const sanitize = (r: { id: string; name: string; email: string; createdAt: Date }): PublicReviewer => ({
  id: r.id,
  name: r.name,
  email: r.email,
  createdAt: r.createdAt,
});

export class ReviewerService {
  private static instance: ReviewerService;
  private constructor() {}
  static getInstance(): ReviewerService {
    if (!this.instance) this.instance = new ReviewerService();
    return this.instance;
  }

  async signup(dto: ReviewerSignupDTO): Promise<ServiceResult<AuthResponse>> {
    try {
      const exists = await ReviewerModel.findOne({ email: dto.email }).lean();
      if (exists) return new ServiceError('Email taken', MESSAGE_KEYS.EMAIL_TAKEN);
      const hashed = await bcrypt.hash(dto.password, 10);
      const id = generateId(16, 'rv');
      const created = await ReviewerModel.create({ id, name: dto.name, email: dto.email, password: hashed });
      const token = JWTUtil.signReviewer({ reviewerId: id, type: 'reviewer' });
      return new ServiceSuccess({ token, reviewer: sanitize(created) }, MESSAGE_KEYS.REVIEWER_CREATED);
    } catch (err) {
      logger.error('Reviewer signup failed', err);
      return new ServiceError('Signup failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async login(dto: ReviewerLoginDTO): Promise<ServiceResult<AuthResponse>> {
    try {
      const reviewer = await ReviewerModel.findOne({ email: dto.email }).select('+password').lean();
      if (!reviewer) return new ServiceError('Invalid', MESSAGE_KEYS.INVALID_CREDENTIALS);
      const ok = await bcrypt.compare(dto.password, reviewer.password);
      if (!ok) return new ServiceError('Invalid', MESSAGE_KEYS.INVALID_CREDENTIALS);
      const token = JWTUtil.signReviewer({ reviewerId: reviewer.id, type: 'reviewer' });
      return new ServiceSuccess({ token, reviewer: sanitize(reviewer) }, MESSAGE_KEYS.REVIEWER_LOGGED_IN);
    } catch (err) {
      logger.error('Reviewer login failed', err);
      return new ServiceError('Login failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async getById(id: string): Promise<ServiceResult<PublicReviewer>> {
    try {
      const reviewer = await ReviewerModel.findOne({ id }).lean();
      if (!reviewer) return new ServiceError('Not found', MESSAGE_KEYS.NOT_FOUND);
      return new ServiceSuccess(sanitize(reviewer), MESSAGE_KEYS.REVIEWER_FETCHED);
    } catch (err) {
      logger.error('Reviewer fetch failed', err);
      return new ServiceError('Fetch failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async update(id: string, dto: ReviewerUpdateDTO): Promise<ServiceResult<PublicReviewer>> {
    try {
      if (dto.email) {
        const conflict = await ReviewerModel.findOne({ email: dto.email, id: { $ne: id } }).lean();
        if (conflict) return new ServiceError('Email taken', MESSAGE_KEYS.EMAIL_TAKEN);
      }
      const updated = await ReviewerModel.findOneAndUpdate({ id }, { $set: dto }, { new: true }).lean();
      if (!updated) return new ServiceError('Not found', MESSAGE_KEYS.NOT_FOUND);
      return new ServiceSuccess(sanitize(updated), MESSAGE_KEYS.REVIEWER_UPDATED);
    } catch (err) {
      logger.error('Reviewer update failed', err);
      return new ServiceError('Update failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async updatePassword(id: string, dto: ReviewerPasswordDTO): Promise<ServiceResult<{ ok: true }>> {
    try {
      const reviewer = await ReviewerModel.findOne({ id }).select('+password');
      if (!reviewer) return new ServiceError('Not found', MESSAGE_KEYS.NOT_FOUND);
      const ok = await bcrypt.compare(dto.currentPassword, reviewer.password);
      if (!ok) return new ServiceError('Wrong password', MESSAGE_KEYS.WRONG_CURRENT_PASSWORD);
      reviewer.password = await bcrypt.hash(dto.newPassword, 10);
      await reviewer.save();
      return new ServiceSuccess({ ok: true }, MESSAGE_KEYS.REVIEWER_PASSWORD_UPDATED);
    } catch (err) {
      logger.error('Reviewer password update failed', err);
      return new ServiceError('Update failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }
}

export const reviewerService = ReviewerService.getInstance();
