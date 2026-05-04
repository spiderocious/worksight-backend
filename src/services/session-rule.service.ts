import { DEFAULT_RULES, ISessionRule, SessionRuleModel } from '@models';
import { ServiceError, ServiceResult, ServiceSuccess } from '@shared/types';
import { MESSAGE_KEYS } from '@shared/constants';
import { generateId, logger } from '@utils';
import { RuleCreateDTO, RuleUpdateDTO } from '@requests/settings.requests';

export class SessionRuleService {
  private static instance: SessionRuleService;
  private constructor() {}
  static getInstance(): SessionRuleService {
    if (!this.instance) this.instance = new SessionRuleService();
    return this.instance;
  }

  async seedDefaultsForReviewer(reviewerId: string): Promise<void> {
    const existing = await SessionRuleModel.exists({ reviewerId });
    if (existing) return;
    const docs = DEFAULT_RULES.map((r) => ({
      id: generateId(16, 'sr'),
      reviewerId,
      ...r,
    }));
    await SessionRuleModel.insertMany(docs);
    logger.info('Seeded default rules for reviewer', { reviewerId, count: docs.length });
  }

  async listAllForReviewer(reviewerId: string): Promise<ServiceResult<ISessionRule[]>> {
    try {
      // Lazy seed: if a reviewer existed before this feature shipped, they have
      // no rules yet. Seed on first access.
      await this.seedDefaultsForReviewer(reviewerId);
      const list = await SessionRuleModel.find({ reviewerId }).sort({ order: 1, createdAt: 1 }).lean();
      return new ServiceSuccess(list as ISessionRule[], MESSAGE_KEYS.RULES_FETCHED);
    } catch (err) {
      logger.error('Rule list failed', err);
      return new ServiceError('List failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async listActiveForCandidate(reviewerId: string): Promise<ServiceResult<ISessionRule[]>> {
    try {
      await this.seedDefaultsForReviewer(reviewerId);
      const list = await SessionRuleModel.find({ reviewerId, active: true })
        .sort({ order: 1, createdAt: 1 })
        .lean();
      return new ServiceSuccess(list as ISessionRule[], MESSAGE_KEYS.RULES_FETCHED);
    } catch (err) {
      logger.error('Rule active-list failed', err);
      return new ServiceError('List failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async create(reviewerId: string, dto: RuleCreateDTO): Promise<ServiceResult<ISessionRule>> {
    try {
      const id = generateId(16, 'sr');
      const created = await SessionRuleModel.create({ id, reviewerId, ...dto });
      return new ServiceSuccess(created.toObject() as ISessionRule, MESSAGE_KEYS.RULE_CREATED);
    } catch (err) {
      logger.error('Rule create failed', err);
      return new ServiceError('Create failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async update(reviewerId: string, id: string, dto: RuleUpdateDTO): Promise<ServiceResult<ISessionRule>> {
    try {
      const updated = await SessionRuleModel.findOneAndUpdate(
        { id, reviewerId },
        { $set: dto },
        { new: true }
      ).lean();
      if (!updated) return new ServiceError('Not found', MESSAGE_KEYS.RULE_NOT_FOUND);
      return new ServiceSuccess(updated as ISessionRule, MESSAGE_KEYS.RULE_UPDATED);
    } catch (err) {
      logger.error('Rule update failed', err);
      return new ServiceError('Update failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async delete(reviewerId: string, id: string): Promise<ServiceResult<{ ok: true }>> {
    try {
      const result = await SessionRuleModel.deleteOne({ id, reviewerId });
      if (result.deletedCount === 0) return new ServiceError('Not found', MESSAGE_KEYS.RULE_NOT_FOUND);
      return new ServiceSuccess({ ok: true }, MESSAGE_KEYS.RULE_DELETED);
    } catch (err) {
      logger.error('Rule delete failed', err);
      return new ServiceError('Delete failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }
}

export const sessionRuleService = SessionRuleService.getInstance();
