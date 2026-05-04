import { DOWNLOADS_DOC_ID, DownloadsModel, IDownloads } from '@models';
import { ServiceError, ServiceResult, ServiceSuccess } from '@shared/types';
import { MESSAGE_KEYS } from '@shared/constants';
import { logger } from '@utils';
import { env } from '@configs/env';
import { DownloadsUpdateDTO } from '@requests/admin.requests';

interface DownloadsPayload {
  mac: {
    installCommand: string;
    installScriptUrl: string;
    releasesUrl: string;
    latestVersion: string;
    releasedAt: string;
  };
}

const toPayload = (doc: IDownloads): DownloadsPayload => ({
  mac: {
    installCommand: doc.installCommand,
    installScriptUrl: doc.installScriptUrl,
    releasesUrl: doc.releasesUrl,
    latestVersion: doc.latestVersion,
    releasedAt: new Date(doc.releasedAt).toISOString(),
  },
});

export class DownloadsService {
  private static instance: DownloadsService;
  private constructor() {}
  static getInstance(): DownloadsService {
    if (!this.instance) this.instance = new DownloadsService();
    return this.instance;
  }

  /**
   * Fetch the singleton downloads doc. Lazily seeded from env vars on first
   * read so existing deployments transparently migrate without manual setup.
   */
  private async getOrCreate(): Promise<IDownloads> {
    const existing = await DownloadsModel.findOne({ id: DOWNLOADS_DOC_ID }).lean();
    if (existing) return existing as IDownloads;
    const seed = await DownloadsModel.create({
      id: DOWNLOADS_DOC_ID,
      installCommand: env.DOWNLOAD_INSTALL_COMMAND,
      installScriptUrl: env.DOWNLOAD_INSTALL_SCRIPT_URL,
      releasesUrl: env.DOWNLOAD_RELEASES_URL,
      latestVersion: env.DOWNLOAD_LATEST_VERSION,
      releasedAt: new Date(env.DOWNLOAD_RELEASED_AT),
    });
    logger.info('Seeded downloads from env');
    return seed.toObject() as IDownloads;
  }

  async get(): Promise<ServiceResult<DownloadsPayload>> {
    try {
      const doc = await this.getOrCreate();
      return new ServiceSuccess(toPayload(doc), MESSAGE_KEYS.DOWNLOADS_FETCHED);
    } catch (err) {
      logger.error('Downloads fetch failed', err);
      return new ServiceError('Fetch failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async update(dto: DownloadsUpdateDTO): Promise<ServiceResult<DownloadsPayload>> {
    try {
      await this.getOrCreate();
      const set: Record<string, unknown> = { ...dto };
      if (dto.releasedAt) set.releasedAt = new Date(dto.releasedAt);
      const updated = await DownloadsModel.findOneAndUpdate(
        { id: DOWNLOADS_DOC_ID },
        { $set: set },
        { new: true }
      ).lean();
      if (!updated) return new ServiceError('Not found', MESSAGE_KEYS.NOT_FOUND);
      return new ServiceSuccess(toPayload(updated as IDownloads), MESSAGE_KEYS.DOWNLOADS_UPDATED);
    } catch (err) {
      logger.error('Downloads update failed', err);
      return new ServiceError('Update failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }
}

export const downloadsService = DownloadsService.getInstance();
