import { z } from "zod";
import { CreatePatientSchema } from "./create-patient.schema";

export const UpdatePatientSchema = CreatePatientSchema;

export type UpdatePatientDto = z.infer<typeof UpdatePatientSchema>;
