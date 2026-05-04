import { z } from 'zod';

export const sessionStartSchema = z.object({
  instanceId: z.string().min(1),
});

export const sessionScreenshotSchema = z.object({
  key: z.string().trim().min(1).max(200),
  capturedAt: z.string().datetime(),
});

export const sessionSubmitSchema = z.object({
  submissionContent: z.string().max(20000).optional(),
  submissionLink: z.string().url().max(500).optional(),
  terminationClean: z.boolean(),
});

export const sessionAbnormalSchema = z.object({
  detectedAt: z.string().datetime().optional(),
});

export const scoreSchema = z.object({
  numericScore: z.number().min(0).max(100),
  feedback: z.string().min(1).max(5000),
});

export type SessionStartDTO = z.infer<typeof sessionStartSchema>;
export type SessionScreenshotDTO = z.infer<typeof sessionScreenshotSchema>;
export type SessionSubmitDTO = z.infer<typeof sessionSubmitSchema>;
export type ScoreDTO = z.infer<typeof scoreSchema>;
