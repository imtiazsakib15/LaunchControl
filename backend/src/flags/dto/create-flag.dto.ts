import { z } from 'zod';

import { rulesSchema } from '../schemas/rule.schema.js';

export const createFlagSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),

  name: z.string().min(1).max(200),

  description: z.string().max(1000).optional(),

  enabled: z.boolean(),

  defaultValue: z.boolean(),

  rolloutPercentage: z.number().int().min(0).max(100),

  rules: rulesSchema,
});

export type CreateFlagInput = z.infer<typeof createFlagSchema>;
