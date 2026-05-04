import { z } from 'zod';

export const reviewerSignupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
});

export const reviewerLoginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export const reviewerUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.string().email().toLowerCase().optional(),
});

export const reviewerPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export type ReviewerSignupDTO = z.infer<typeof reviewerSignupSchema>;
export type ReviewerLoginDTO = z.infer<typeof reviewerLoginSchema>;
export type ReviewerUpdateDTO = z.infer<typeof reviewerUpdateSchema>;
export type ReviewerPasswordDTO = z.infer<typeof reviewerPasswordSchema>;
