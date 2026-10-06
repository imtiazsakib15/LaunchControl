import { z } from 'zod';

export const disableFlagSchema = z.object({
  reason: z.string().min(1).max(1000),
});

export type DisableFlagInput = z.infer<typeof disableFlagSchema>;
