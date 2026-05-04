import mongoose, { Schema, Document } from 'mongoose';

export interface IReviewer {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReviewerDocument extends IReviewer, Document {}

const reviewerSchema = new Schema<IReviewerDocument>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, select: false },
  },
  { timestamps: true, collection: 'reviewers' }
);

export const ReviewerModel = mongoose.model<IReviewerDocument>('Reviewer', reviewerSchema);
