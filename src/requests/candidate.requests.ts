import { z } from 'zod';

export const candidateCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().email().toLowerCase(),
});

export const candidateUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.string().email().toLowerCase().optional(),
});

export const candidateAuthSchema = z.object({
  accessCode: z.string().trim().length(10),
});

export type CandidateCreateDTO = z.infer<typeof candidateCreateSchema>;
export type CandidateUpdateDTO = z.infer<typeof candidateUpdateSchema>;
export type CandidateAuthDTO = z.infer<typeof candidateAuthSchema>;
