import { z } from "zod";

export const AccessCodeSchema = z.object({
  id: z.number().int().positive(),
  createdAt: z.coerce.date(),
  createdByUserId: z.number().int().positive().nullable(),
  redeemedAt: z.coerce.date().nullable(),
  redeemedByEmail: z.string().nullable(),
  redeemedByUserId: z.number().int().positive().nullable(),
  revokedAt: z.coerce.date().nullable(),
  expiresAt: z.coerce.date().nullable(),
  isInitialAccessCode: z.boolean(),
});

export const AccessCodesResponseSchema = z.array(AccessCodeSchema);

export type AccessCode = z.infer<typeof AccessCodeSchema>;
