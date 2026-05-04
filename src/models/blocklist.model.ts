import mongoose, { Schema, Document } from 'mongoose';

export interface IBlocklist {
  id: string;
  domains: string[];
  updatedAt: Date;
  createdAt: Date;
}

export interface IBlocklistDocument extends IBlocklist, Document {}

const blocklistSchema = new Schema<IBlocklistDocument>(
  {
    id: { type: String, required: true, unique: true },
    domains: { type: [String], default: [] },
  },
  { timestamps: true, collection: 'blocklist' }
);

export const BlocklistModel = mongoose.model<IBlocklistDocument>('Blocklist', blocklistSchema);

export const DEFAULT_BLOCKLIST: string[] = [
  'chat.openai.com',
  'chatgpt.com',
  'claude.ai',
  'gemini.google.com',
  'bard.google.com',
  'copilot.microsoft.com',
  'github.com/copilot',
  'you.com',
  'phind.com',
  'perplexity.ai',
  'stackoverflow.com',
  'developer.mozilla.org',
];
