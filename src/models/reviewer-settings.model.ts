import mongoose, { Schema, Document } from 'mongoose';

export interface IScreenshotIntervalRange {
  min: number; // seconds
  max: number; // seconds
}

export interface IReviewerSettings {
  id: string;
  reviewerId: string;
  postSubmissionTitle: string;
  postSubmissionDescription: string;
  showScreenshotWarning: boolean;
  screenshotIntervalSeconds: IScreenshotIntervalRange;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReviewerSettingsDocument extends IReviewerSettings, Document {}

const intervalSchema = new Schema<IScreenshotIntervalRange>(
  {
    min: { type: Number, required: true, min: 30, max: 1800 },
    max: { type: Number, required: true, min: 31, max: 1800 },
  },
  { _id: false }
);

const reviewerSettingsSchema = new Schema<IReviewerSettingsDocument>(
  {
    id: { type: String, required: true, unique: true },
    reviewerId: { type: String, required: true, unique: true, index: true },
    postSubmissionTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
      default: 'Submission received',
    },
    postSubmissionDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
      default:
        'Network restrictions have been lifted. Your reviewer will see the screenshots and your submission, and will get back to you with feedback.',
    },
    showScreenshotWarning: { type: Boolean, default: true },
    screenshotIntervalSeconds: {
      type: intervalSchema,
      default: () => ({ min: 60, max: 240 }),
    },
  },
  { timestamps: true, collection: 'reviewer_settings' }
);

export const ReviewerSettingsModel = mongoose.model<IReviewerSettingsDocument>(
  'ReviewerSettings',
  reviewerSettingsSchema
);

export const DEFAULT_SETTINGS = {
  postSubmissionTitle: 'Submission received',
  postSubmissionDescription:
    'Network restrictions have been lifted. Your reviewer will see the screenshots and your submission, and will get back to you with feedback.',
  showScreenshotWarning: true,
  screenshotIntervalSeconds: { min: 60, max: 240 },
} as const;
