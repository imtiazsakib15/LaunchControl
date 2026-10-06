import { z } from 'zod';

import { rulesSchema } from '../schemas/rule.schema.js';

export const updateFlagSchema = z.object({
  expectedVersion: z.number().int().min(1),

  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  enabled: z.boolean(),
  defaultValue: z.boolean(),
  rolloutPercentage: z.number().int().min(0).max(100),
  rules: rulesSchema,
});

export type UpdateFlagInput = z.infer<typeof updateFlagSchema>;
