import { z } from "zod";
import { FingerprintSchema } from "./cert-fingerprint.schema";

export const RenameDeviceSchema = z
  .object({
    fingerprint: FingerprintSchema,
    name: z.string().trim().min(1, "Name is required.").max(255, "Name cannot be longer than 255 characters."),
  })
  .strict();

export type RenameDeviceDto = z.infer<typeof RenameDeviceSchema>;
