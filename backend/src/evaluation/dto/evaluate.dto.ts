import { z } from 'zod';

export const evaluateSchema = z.object({
  flagKey: z.string().min(1).max(100),

  user: z.object({
    key: z.string().optional(),

    attributes: z.record(z.string(), z.unknown()).optional(),
  }),
});

export type EvaluateInput = z.infer<typeof evaluateSchema>;
