import mongoose, { Schema, Document } from 'mongoose';

export type SubmissionType = 'link' | 'text' | 'both';

export interface IAssignment {
  id: string;
  title: string;
  brief: string;
  submissionType: SubmissionType;
  durationMinutes: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAssignmentDocument extends IAssignment, Document {}

const assignmentSchema = new Schema<IAssignmentDocument>(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    brief: { type: String, required: true },
    submissionType: { type: String, enum: ['link', 'text', 'both'], required: true },
    durationMinutes: { type: Number, required: true, min: 1 },
    createdBy: { type: String, required: true, index: true },
  },
  { timestamps: true, collection: 'assignments' }
);

export const AssignmentModel = mongoose.model<IAssignmentDocument>('Assignment', assignmentSchema);
