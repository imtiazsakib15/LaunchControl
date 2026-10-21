import { z } from 'zod';
import { flagKeySchema } from './flag-key.dto.js';
import { rulesSchema } from '../schemas/rule.schema.js';

export const createFlagSchema = z
  .object({
    key: flagKeySchema,

    name: z.string().trim().min(1).max(200),

    description: z.string().max(1000).optional(),

    enabled: z.boolean(),

    defaultValue: z.boolean(),

    rolloutPercentage: z.number().int().min(0).max(100),

    rules: rulesSchema,
  })
  .strict();

export type CreateFlagInput = z.infer<typeof createFlagSchema>;
