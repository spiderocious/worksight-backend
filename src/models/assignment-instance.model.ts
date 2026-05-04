import mongoose, { Schema, Document } from 'mongoose';

export type InstanceStatus = 'pending' | 'in_progress' | 'submitted' | 'scored';

export interface IAssignmentInstance {
  id: string;
  assignmentId: string;
  candidateId: string;
  reviewerId: string;
  deadline?: Date | null;
  status: InstanceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAssignmentInstanceDocument extends IAssignmentInstance, Document {}

const instanceSchema = new Schema<IAssignmentInstanceDocument>(
  {
    id: { type: String, required: true, unique: true },
    assignmentId: { type: String, required: true, index: true },
    candidateId: { type: String, required: true, index: true },
    reviewerId: { type: String, required: true, index: true },
    deadline: { type: Date, default: null },
    status: { type: String, enum: ['pending', 'in_progress', 'submitted', 'scored'], default: 'pending', index: true },
  },
  { timestamps: true, collection: 'assignment_instances' }
);

instanceSchema.index({ candidateId: 1, status: 1 });

export const AssignmentInstanceModel = mongoose.model<IAssignmentInstanceDocument>(
  'AssignmentInstance',
  instanceSchema
);
