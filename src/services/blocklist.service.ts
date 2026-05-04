import { BlocklistModel, DEFAULT_BLOCKLIST } from '@models';
import { ServiceError, ServiceResult, ServiceSuccess } from '@shared/types';
import { MESSAGE_KEYS } from '@shared/constants';
import { generateId, logger } from '@utils';

const SINGLETON_ID = 'blocklist_default';

export class BlocklistService {
  private static instance: BlocklistService;
  private constructor() {}
  static getInstance(): BlocklistService {
    if (!this.instance) this.instance = new BlocklistService();
    return this.instance;
  }

  async ensureSeeded(): Promise<void> {
    const existing = await BlocklistModel.findOne({ id: SINGLETON_ID }).lean();
    if (existing) return;
    await BlocklistModel.create({ id: SINGLETON_ID, domains: DEFAULT_BLOCKLIST });
    logger.info('Seeded default blocklist', { count: DEFAULT_BLOCKLIST.length });
    void generateId;
  }

  async get(): Promise<ServiceResult<{ domains: string[]; updatedAt: Date }>> {
    try {
      const list = await BlocklistModel.findOne({ id: SINGLETON_ID }).lean();
      if (!list) {
        await this.ensureSeeded();
        const seeded = await BlocklistModel.findOne({ id: SINGLETON_ID }).lean();
        return new ServiceSuccess(
          { domains: seeded?.domains ?? DEFAULT_BLOCKLIST, updatedAt: seeded?.updatedAt ?? new Date() },
          MESSAGE_KEYS.BLOCKLIST_FETCHED
        );
      }
      return new ServiceSuccess(
        { domains: list.domains, updatedAt: list.updatedAt },
        MESSAGE_KEYS.BLOCKLIST_FETCHED
      );
    } catch (err) {
      logger.error('Blocklist fetch failed', err);
      return new ServiceError('Fetch failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }
}

export const blocklistService = BlocklistService.getInstance();
