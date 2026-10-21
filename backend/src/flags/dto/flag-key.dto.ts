import { z } from 'zod';

export const flagKeySchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9-]+$/);

export type FlagKey = z.infer<typeof flagKeySchema>;
