import { z } from 'zod';

const placeholderAdminTokens = new Set([
  'change-me',
  'changeme',
  'test-admin-token',
  'admin',
  'password',
  'secret',
  'your-token-here',
]);

export const envSchema = z
  .object({
    DATABASE_URL: z.string().url(),
    ADMIN_TOKEN: z
      .string()
      .min(1)
      .refine((token) => token.trim().length > 0),
    NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
  })
  .superRefine((config, context) => {
    if (
      config.NODE_ENV === 'production' &&
      placeholderAdminTokens.has(config.ADMIN_TOKEN.trim().toLowerCase())
    ) {
      context.addIssue({
        code: 'custom',
        path: ['ADMIN_TOKEN'],
        message: 'A placeholder ADMIN_TOKEN cannot be used in production.',
      });
    }
  });

export function validateEnv(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    // Avoid exposing environment values or database credentials in errors.
    throw new Error(
      'Environment validation failed: invalid or missing environment configuration.',
    );
  }

  return result.data;
}
