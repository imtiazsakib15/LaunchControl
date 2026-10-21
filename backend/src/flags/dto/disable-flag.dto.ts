import z from 'zod';

export const disableFlagSchema = z
  .object({
    reason: z.string().trim().min(1).max(1000),
  })
  .strict();

export type DisableFlagInput = z.infer<typeof disableFlagSchema>;
