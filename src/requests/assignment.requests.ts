import { z } from 'zod';

const baseAssignmentShape = {
  title: z.string().trim().min(1).max(160),
  brief: z.string().min(1),
  submissionType: z.enum(['link', 'text', 'both']),
  durationMinutes: z.number().int().min(1).max(60 * 12),
  hideUntilStart: z.boolean().optional().default(false),
  mainTitle: z.string().trim().min(1).max(160).nullable().optional(),
  mainBrief: z.string().min(1).nullable().optional(),
};

// When `hideUntilStart` is true, mainTitle and mainBrief become required.
const requireMainWhenHidden = (
  data: { hideUntilStart?: boolean; mainTitle?: string | null; mainBrief?: string | null },
  ctx: z.RefinementCtx
): void => {
  if (!data.hideUntilStart) return;
  if (!data.mainTitle || data.mainTitle.trim().length === 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['mainTitle'],
      message: 'mainTitle is required when hideUntilStart is true',
    });
  }
  if (!data.mainBrief || data.mainBrief.trim().length === 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['mainBrief'],
      message: 'mainBrief is required when hideUntilStart is true',
    });
  }
};

export const assignmentCreateSchema = z
  .object(baseAssignmentShape)
  .superRefine(requireMainWhenHidden);

// .partial() doesn't compose with .superRefine() easily. Build the update
// shape from scratch so every field is optional, then refine with the same
// rule (only enforced when hideUntilStart is explicitly true in the body).
export const assignmentUpdateSchema = z
  .object({
    title: baseAssignmentShape.title.optional(),
    brief: baseAssignmentShape.brief.optional(),
    submissionType: baseAssignmentShape.submissionType.optional(),
    durationMinutes: baseAssignmentShape.durationMinutes.optional(),
    hideUntilStart: z.boolean().optional(),
    mainTitle: baseAssignmentShape.mainTitle,
    mainBrief: baseAssignmentShape.mainBrief,
  })
  .superRefine((data, ctx) => {
    if (data.hideUntilStart === true) {
      // On a PATCH that flips hideUntilStart to true, the body MUST also include
      // valid mainTitle + mainBrief — we can't easily check the existing doc here
      // without making the schema async. Reviewer-side form should always send
      // both fields when toggling on, so this is fine.
      requireMainWhenHidden(data, ctx);
    }
  });

export const assignmentAssignSchema = z.object({
  candidateId: z.string().min(1),
  deadline: z.string().datetime().optional(),
});

// Bulk-assign: N candidates × M assignments. Each assignment carries its own
// deadline (the deadline applies to every candidate getting that assignment —
// per-cell deadlines aren't supported, intentionally; see docs/updates-v4.md).
export const assignmentBulkAssignSchema = z.object({
  assignments: z
    .array(
      z.object({
        assignmentId: z.string().min(1),
        deadline: z.string().datetime().nullable().optional(),
      })
    )
    .min(1, 'Pick at least one assignment')
    .max(50, 'Too many assignments in one bulk-assign'),
  candidateIds: z
    .array(z.string().min(1))
    .min(1, 'Pick at least one candidate')
    .max(100, 'Too many candidates in one bulk-assign'),
});

export type AssignmentCreateDTO = z.infer<typeof assignmentCreateSchema>;
export type AssignmentUpdateDTO = z.infer<typeof assignmentUpdateSchema>;
export type AssignmentAssignDTO = z.infer<typeof assignmentAssignSchema>;
export type AssignmentBulkAssignDTO = z.infer<typeof assignmentBulkAssignSchema>;
