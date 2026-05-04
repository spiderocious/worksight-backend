import { z } from 'zod';

export const assignmentCreateSchema = z.object({
  title: z.string().trim().min(1).max(160),
  brief: z.string().min(1),
  submissionType: z.enum(['link', 'text', 'both']),
  durationMinutes: z.number().int().min(1).max(60 * 12),
});

export const assignmentUpdateSchema = assignmentCreateSchema.partial();

export const assignmentAssignSchema = z.object({
  candidateId: z.string().min(1),
  deadline: z.string().datetime().optional(),
});

export type AssignmentCreateDTO = z.infer<typeof assignmentCreateSchema>;
export type AssignmentUpdateDTO = z.infer<typeof assignmentUpdateSchema>;
export type AssignmentAssignDTO = z.infer<typeof assignmentAssignSchema>;
