import mongoose, { Schema, Document } from 'mongoose';

export interface IBlockedAttempt {
  id: string;
  sessionId: string;
  candidateId: string;
  reviewerId: string;
  domain: string;
  attemptedAt: Date;
  // Optional — the Electron app captures a screenshot at the moment of the
  // attempt and registers the resulting key here, so reviewers can open the
  // image alongside the URL log. May be missing if the screenshot upload failed.
  screenshotKey?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBlockedAttemptDocument extends IBlockedAttempt, Document {}

const blockedAttemptSchema = new Schema<IBlockedAttemptDocument>(
  {
    id: { type: String, required: true, unique: true },
    sessionId: { type: String, required: true, index: true },
    candidateId: { type: String, required: true, index: true },
    reviewerId: { type: String, required: true, index: true },
    domain: { type: String, required: true, trim: true, maxlength: 255 },
    attemptedAt: { type: Date, required: true },
    screenshotKey: { type: String, default: null },
  },
  { timestamps: true, collection: 'blocked_attempts' }
);

blockedAttemptSchema.index({ sessionId: 1, attemptedAt: 1 });

export const BlockedAttemptModel = mongoose.model<IBlockedAttemptDocument>(
  'BlockedAttempt',
  blockedAttemptSchema
);
