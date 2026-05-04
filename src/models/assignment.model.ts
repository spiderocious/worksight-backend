import mongoose, { Schema, Document } from 'mongoose';

export type SubmissionType = 'link' | 'text' | 'both';

export interface IAssignment {
  id: string;
  title: string;
  brief: string;
  submissionType: SubmissionType;
  durationMinutes: number;
  // When true, `title` + `brief` are public-facing (shown on the dashboard,
  // brief screen, invite page) and `mainTitle` + `mainBrief` are the real
  // test the candidate sees only after clicking Start. Reviewers use this to
  // drop hints (e.g. "come prepared with Postgres") without revealing the
  // actual prompt.
  hideUntilStart: boolean;
  mainTitle?: string | null;
  mainBrief?: string | null;
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
    hideUntilStart: { type: Boolean, default: false },
    mainTitle: { type: String, default: null, trim: true },
    mainBrief: { type: String, default: null },
    createdBy: { type: String, required: true, index: true },
  },
  { timestamps: true, collection: 'assignments' }
);

export const AssignmentModel = mongoose.model<IAssignmentDocument>('Assignment', assignmentSchema);
