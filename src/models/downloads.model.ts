import mongoose, { Schema, Document } from 'mongoose';

export interface IDownloads {
  id: string;
  installCommand: string;
  installScriptUrl: string;
  releasesUrl: string;
  latestVersion: string;
  releasedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDownloadsDocument extends IDownloads, Document {}

const downloadsSchema = new Schema<IDownloadsDocument>(
  {
    id: { type: String, required: true, unique: true },
    installCommand: { type: String, required: true, trim: true, maxlength: 500 },
    installScriptUrl: { type: String, required: true, trim: true, maxlength: 500 },
    releasesUrl: { type: String, required: true, trim: true, maxlength: 500 },
    latestVersion: { type: String, required: true, trim: true, maxlength: 60 },
    releasedAt: { type: Date, required: true },
  },
  { timestamps: true, collection: 'downloads' }
);

export const DownloadsModel = mongoose.model<IDownloadsDocument>('Downloads', downloadsSchema);

// The single canonical doc id — there's only ever one Downloads doc.
export const DOWNLOADS_DOC_ID = 'downloads_default';
