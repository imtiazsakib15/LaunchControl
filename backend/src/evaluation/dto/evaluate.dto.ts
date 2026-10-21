import { z } from 'zod';
import { flagKeySchema } from '../../flags/dto/flag-key.dto.js';

export const evaluateSchema = z
  .object({
    flagKey: flagKeySchema,
    user: z
      .object({
        key: z.string().min(1).max(200).optional(),
        attributes: z.record(z.string(), z.unknown()).optional(),
      })
      .strict(),
  })
  .strict();

export type EvaluateInput = z.infer<typeof evaluateSchema>;
