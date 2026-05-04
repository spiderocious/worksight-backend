import mongoose, { Schema, Document } from 'mongoose';

export interface ICandidate {
  id: string;
  name: string;
  email: string;
  accessCode: string;
  reviewerId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICandidateDocument extends ICandidate, Document {}

const candidateSchema = new Schema<ICandidateDocument>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    accessCode: { type: String, required: true, unique: true, index: true },
    reviewerId: { type: String, required: true, index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'candidates' }
);

candidateSchema.index({ reviewerId: 1, email: 1 });

export const CandidateModel = mongoose.model<ICandidateDocument>('Candidate', candidateSchema);
