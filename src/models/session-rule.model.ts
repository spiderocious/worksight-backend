import mongoose, { Schema, Document } from 'mongoose';

export interface ISessionRule {
  id: string;
  reviewerId: string;
  icon: string;
  title: string;
  subtitle: string;
  active: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISessionRuleDocument extends ISessionRule, Document {}

const sessionRuleSchema = new Schema<ISessionRuleDocument>(
  {
    id: { type: String, required: true, unique: true },
    reviewerId: { type: String, required: true, index: true },
    icon: { type: String, required: true, trim: true, maxlength: 60 },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    subtitle: { type: String, required: true, trim: true, maxlength: 800 },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'session_rules' }
);

sessionRuleSchema.index({ reviewerId: 1, order: 1 });

export const SessionRuleModel = mongoose.model<ISessionRuleDocument>(
  'SessionRule',
  sessionRuleSchema
);

// The five hard-coded rules from the original Electron RulesScreen. We seed
// these for every new reviewer on signup. The reviewer can then edit / hide
// any of them.
export const DEFAULT_RULES: Array<Omit<ISessionRule, 'id' | 'reviewerId' | 'createdAt' | 'updatedAt'>> = [
  {
    icon: 'ShieldAlert',
    title: 'AI tools and reference sites will be blocked',
    subtitle:
      'ChatGPT, Claude, Gemini, Copilot, Stack Overflow, MDN and similar sites will be unreachable on this Mac for the duration of the session. The block is enforced at the network level.',
    active: true,
    order: 0,
  },
  {
    icon: 'Hourglass',
    title: 'The countdown cannot be paused',
    subtitle:
      'The timer runs on the WorkSight server. It will continue counting down even if the WorkSight app is closed or this Mac is restarted. When it reaches zero, the session is over.',
    active: true,
    order: 1,
  },
  {
    icon: 'Lock',
    title: 'The app cannot be quit normally',
    subtitle:
      'Cmd+Q is intercepted while a session is active. To leave the session you must submit your work.',
    active: true,
    order: 2,
  },
  {
    icon: 'Camera',
    title: 'Random screenshots will be captured',
    subtitle:
      'Your screen will be captured at random intervals. Your reviewer will see these as part of evaluating your submission.',
    active: true,
    order: 3,
  },
  {
    icon: 'Activity',
    title: 'Force-quitting will be flagged',
    subtitle:
      'If you force-quit WorkSight or restart the machine, the session is flagged as abnormally terminated. The server will still close the session at the deadline whether or not you submit.',
    active: true,
    order: 4,
  },
];
