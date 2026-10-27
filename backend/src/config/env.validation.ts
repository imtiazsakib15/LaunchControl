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
    if (config.NODE_ENV !== 'production') {
      return;
    }

    const token = config.ADMIN_TOKEN.trim();

    if (token.length < 32) {
      context.addIssue({
        code: 'custom',
        path: ['ADMIN_TOKEN'],
        message: 'Production ADMIN_TOKEN must be at least 32 characters.',
      });
    }

    if (placeholderAdminTokens.has(token.toLowerCase())) {
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
