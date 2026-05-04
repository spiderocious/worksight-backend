import { DEFAULT_SETTINGS, IReviewerSettings, ReviewerSettingsModel } from '@models';
import { ServiceError, ServiceResult, ServiceSuccess } from '@shared/types';
import { MESSAGE_KEYS } from '@shared/constants';
import { generateId, logger } from '@utils';
import { SettingsUpdateDTO } from '@requests/settings.requests';

interface CandidateFacingSettings {
  postSubmissionTitle: string;
  postSubmissionDescription: string;
  showScreenshotWarning: boolean;
}

export class ReviewerSettingsService {
  private static instance: ReviewerSettingsService;
  private constructor() {}
  static getInstance(): ReviewerSettingsService {
    if (!this.instance) this.instance = new ReviewerSettingsService();
    return this.instance;
  }

  async getOrCreate(reviewerId: string): Promise<IReviewerSettings> {
    const existing = await ReviewerSettingsModel.findOne({ reviewerId }).lean();
    if (existing) return existing as IReviewerSettings;
    const id = generateId(16, 'rs');
    const created = await ReviewerSettingsModel.create({
      id,
      reviewerId,
      ...DEFAULT_SETTINGS,
    });
    return created.toObject() as IReviewerSettings;
  }

  async get(reviewerId: string): Promise<ServiceResult<IReviewerSettings>> {
    try {
      const settings = await this.getOrCreate(reviewerId);
      return new ServiceSuccess(settings, MESSAGE_KEYS.SETTINGS_FETCHED);
    } catch (err) {
      logger.error('Settings fetch failed', err);
      return new ServiceError('Fetch failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async getForCandidate(reviewerId: string): Promise<ServiceResult<CandidateFacingSettings>> {
    try {
      const settings = await this.getOrCreate(reviewerId);
      return new ServiceSuccess(
        {
          postSubmissionTitle: settings.postSubmissionTitle,
          postSubmissionDescription: settings.postSubmissionDescription,
          showScreenshotWarning: settings.showScreenshotWarning,
        },
        MESSAGE_KEYS.SETTINGS_FETCHED
      );
    } catch (err) {
      logger.error('Candidate settings fetch failed', err);
      return new ServiceError('Fetch failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async update(reviewerId: string, dto: SettingsUpdateDTO): Promise<ServiceResult<IReviewerSettings>> {
    try {
      // Ensure the row exists so $set has something to land on.
      await this.getOrCreate(reviewerId);
      const updated = await ReviewerSettingsModel.findOneAndUpdate(
        { reviewerId },
        { $set: dto },
        { new: true }
      ).lean();
      if (!updated) return new ServiceError('Not found', MESSAGE_KEYS.NOT_FOUND);
      return new ServiceSuccess(updated as IReviewerSettings, MESSAGE_KEYS.SETTINGS_UPDATED);
    } catch (err) {
      logger.error('Settings update failed', err);
      return new ServiceError('Update failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }
}

export const reviewerSettingsService = ReviewerSettingsService.getInstance();
