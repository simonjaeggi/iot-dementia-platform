import { z } from "zod";

const PatientInputSchema = z
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

export const PatientSchema = PatientInputSchema.extend({
  id: z.number().int().positive(),
});

export const CreatePatientSchema = PatientInputSchema;
export const UpdatePatientSchema = PatientInputSchema;

export const PatientResponseSchema = z.object({
  patient: PatientSchema.nullable(),
});

export type Patient = z.infer<typeof PatientSchema>;
export type CreatePatient = z.infer<typeof CreatePatientSchema>;
export type UpdatePatient = z.infer<typeof UpdatePatientSchema>;
