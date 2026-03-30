import { z } from "zod";

export const CreatePatientSchema = z
  .object({
    surname: z
      .string()
      .trim()
      .min(1, "Surname is required.")
      .max(255, "Surname cannot be longer than 255 characters."),
    lastname: z
      .string()
      .trim()
      .min(1, "Lastname is required.")
      .max(255, "Lastname cannot be longer than 255 characters."),
    birthday: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Birthday must be in YYYY-MM-DD format."),
  })
  .strict();

export type CreatePatientDto = z.infer<typeof CreatePatientSchema>;
