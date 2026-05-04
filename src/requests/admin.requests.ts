import { z } from 'zod';

export const adminLoginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export const downloadsUpdateSchema = z.object({
  installCommand: z.string().trim().min(1).max(500).optional(),
  installScriptUrl: z.string().url().max(500).optional(),
  releasesUrl: z.string().url().max(500).optional(),
  latestVersion: z.string().trim().min(1).max(60).optional(),
  releasedAt: z.string().datetime().optional(),
});

export const blocklistUpdateSchema = z.object({
  domains: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(255)
        .regex(/^[A-Za-z0-9.-]+$/, 'Invalid domain')
    )
    .min(0)
    .max(500),
});

export const usersListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type AdminLoginDTO = z.infer<typeof adminLoginSchema>;
export type DownloadsUpdateDTO = z.infer<typeof downloadsUpdateSchema>;
export type BlocklistUpdateDTO = z.infer<typeof blocklistUpdateSchema>;
export type UsersListQueryDTO = z.infer<typeof usersListQuerySchema>;
