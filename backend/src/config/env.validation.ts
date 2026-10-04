import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  ADMIN_TOKEN: z.string().min(1),
});

export function validateEnv(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    throw new Error(`Environment validation failed:\n${result.error.message}`);
  }

  return result.data;
}
