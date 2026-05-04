import mongoose, { Schema, Document } from 'mongoose';

export type SessionStatus = 'in_progress' | 'submitted';

export interface IScreenshotRef {
  key: string;
  capturedAt: Date;
}

export interface ISession {
  id: string;
  instanceId: string;
  candidateId: string;
  reviewerId: string;
  startedAt: Date;
  expiresAt: Date;
  endedAt?: Date | null;
  durationSeconds?: number | null;
  status: SessionStatus;
  submissionContent?: string | null;
  submissionLink?: string | null;
  terminationClean?: boolean | null;
  autoClosed: boolean;
  screenshots: IScreenshotRef[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ISessionDocument extends ISession, Document {}

const screenshotSchema = new Schema<IScreenshotRef>(
  {
    key: { type: String, required: true },
    capturedAt: { type: Date, required: true },
  },
  { _id: false }
);

const sessionSchema = new Schema<ISessionDocument>(
  {
    id: { type: String, required: true, unique: true },
    instanceId: { type: String, required: true, index: true },
    candidateId: { type: String, required: true, index: true },
    reviewerId: { type: String, required: true, index: true },
    startedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: true },
    endedAt: { type: Date, default: null },
    durationSeconds: { type: Number, default: null },
    status: { type: String, enum: ['in_progress', 'submitted'], default: 'in_progress', index: true },
    submissionContent: { type: String, default: null },
    submissionLink: { type: String, default: null },
    terminationClean: { type: Boolean, default: null },
    autoClosed: { type: Boolean, default: false },
    screenshots: { type: [screenshotSchema], default: [] },
  },
  { timestamps: true, collection: 'sessions' }
);

sessionSchema.index({ candidateId: 1, status: 1 });

export const SessionModel = mongoose.model<ISessionDocument>('Session', sessionSchema);
