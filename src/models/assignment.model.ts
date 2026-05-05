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

// Some imported rows landed with literal "\n" / "\t" (two chars) instead of
// real newlines/tabs. Markdown renderers can't break lines on those, so we
// normalise on read. Idempotent: a no-op on already-clean strings.
const unescapeWhitespace = <T extends string | null | undefined>(v: T): T => {
  if (typeof v !== 'string') return v;
  return v.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t') as T;
};

const assignmentSchema = new Schema<IAssignmentDocument>(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    brief: { type: String, required: true, get: unescapeWhitespace },
    submissionType: { type: String, enum: ['link', 'text', 'both'], required: true },
    durationMinutes: { type: Number, required: true, min: 1 },
    hideUntilStart: { type: Boolean, default: false },
    mainTitle: { type: String, default: null, trim: true },
    mainBrief: { type: String, default: null, get: unescapeWhitespace },
    createdBy: { type: String, required: true, index: true },
  },
  { timestamps: true, collection: 'assignments', toJSON: { getters: true }, toObject: { getters: true } }
);

export const AssignmentModel = mongoose.model<IAssignmentDocument>('Assignment', assignmentSchema);

// Apply to lean() results, since lean docs skip schema getters.
export function normalizeAssignment<T extends Partial<IAssignment> | null | undefined>(a: T): T {
  if (!a) return a;
  if (a.brief != null) (a as IAssignment).brief = unescapeWhitespace((a as IAssignment).brief);
  if (a.mainBrief != null) (a as IAssignment).mainBrief = unescapeWhitespace((a as IAssignment).mainBrief);
  return a;
}
