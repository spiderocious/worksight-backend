import { z } from 'zod';

const ICON_NAME = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[A-Za-z][A-Za-z0-9]*$/, 'Icon name must be a Lucide identifier');

export const ruleCreateSchema = z.object({
  icon: ICON_NAME,
  title: z.string().trim().min(1).max(160),
  subtitle: z.string().trim().min(1).max(800),
  active: z.boolean().optional().default(true),
  order: z.number().int().min(0).max(1000).optional().default(0),
});

export const ruleUpdateSchema = ruleCreateSchema.partial();

const intervalSchema = z
  .object({
    min: z.number().int().min(30).max(1800),
    max: z.number().int().min(31).max(1800),
  })
  .refine((v) => v.min < v.max, {
    message: 'min must be less than max',
    path: ['min'],
  });

export const settingsUpdateSchema = z.object({
  postSubmissionTitle: z.string().trim().min(1).max(160).optional(),
  postSubmissionDescription: z.string().trim().min(1).max(1000).optional(),
  showScreenshotWarning: z.boolean().optional(),
  screenshotIntervalSeconds: intervalSchema.optional(),
});

export type RuleCreateDTO = z.infer<typeof ruleCreateSchema>;
export type RuleUpdateDTO = z.infer<typeof ruleUpdateSchema>;
export type SettingsUpdateDTO = z.infer<typeof settingsUpdateSchema>;
