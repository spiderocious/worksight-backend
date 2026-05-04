import { ServiceResult, ServiceSuccess } from '@shared/types';
import { MESSAGE_KEYS } from '@shared/constants';
import { env } from '@configs/env';

interface DownloadsPayload {
  mac: {
    url: string;
    version: string;
    releasedAt: string;
    brewInstall: string;
  };
}

export class DownloadsService {
  private static instance: DownloadsService;
  private constructor() {}
  static getInstance(): DownloadsService {
    if (!this.instance) this.instance = new DownloadsService();
    return this.instance;
  }

  async get(): Promise<ServiceResult<DownloadsPayload>> {
    return new ServiceSuccess(
      {
        mac: {
          url: env.DOWNLOAD_MAC_URL,
          version: env.DOWNLOAD_MAC_VERSION,
          releasedAt: env.DOWNLOAD_MAC_RELEASED_AT,
          brewInstall: env.DOWNLOAD_BREW_INSTALL,
        },
      },
      MESSAGE_KEYS.DOWNLOADS_FETCHED
    );
  }
}

export const downloadsService = DownloadsService.getInstance();
