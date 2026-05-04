import mongoose, { Schema, Document } from 'mongoose';

export interface IScore {
  id: string;
  sessionId: string;
  reviewerId: string;
  numericScore: number;
  feedback: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IScoreDocument extends IScore, Document {}

const scoreSchema = new Schema<IScoreDocument>(
  {
    id: { type: String, required: true, unique: true },
    sessionId: { type: String, required: true, unique: true, index: true },
    reviewerId: { type: String, required: true, index: true },
    numericScore: { type: Number, required: true, min: 0, max: 100 },
    feedback: { type: String, required: true },
  },
  { timestamps: true, collection: 'scores' }
);

export const ScoreModel = mongoose.model<IScoreDocument>('Score', scoreSchema);
