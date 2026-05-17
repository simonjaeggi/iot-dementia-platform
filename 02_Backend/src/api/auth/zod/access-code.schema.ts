import z from "zod";

export const AccessCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/, "Invalid access code");

export type AccessCode = z.infer<typeof AccessCodeSchema>;

export const CreateAccessCodeSchema = z.object({
  daysValid: z
    .number()
    .int()
    .positive()
    .max(14, "Access code cannot be valid for longer than 2 weeks."),
});

export const RevokeAccessCodeSchema = z.object({
  id: z.number().int().positive(),
});
export type RevokeAccessCodeDto = z.infer<typeof RevokeAccessCodeSchema>;
