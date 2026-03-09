import { z } from "zod";

export const FingerprintSchema = z
  .string()
  .trim()
  .transform(s => s.replace(/:/g, "").toLowerCase())
  .refine(s => /^[0-9a-f]{64}$/.test(s), {
    message: "Invalid fingerprint format",
  });

export type FingerprintDto = z.infer<typeof FingerprintSchema>;