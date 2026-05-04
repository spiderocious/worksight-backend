import mongoose, { Schema, Document } from 'mongoose';

export interface IAdmin {
  id: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAdminDocument extends IAdmin, Document {}

const adminSchema = new Schema<IAdminDocument>(
  {
    id: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, select: false },
  },
  { timestamps: true, collection: 'admins' }
);

export const AdminModel = mongoose.model<IAdminDocument>('Admin', adminSchema);
