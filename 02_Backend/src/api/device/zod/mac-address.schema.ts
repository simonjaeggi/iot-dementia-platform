import { z } from "zod";

function normaliseMacAddress(value: string): string {
  return value.trim().replace(/-/g, ":").toUpperCase();
}

export const MacAddressSchema = z
  .string()
  .transform(normaliseMacAddress)
  .refine((value) => /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(value), {
    message:
      "MAC identifier must be in the format AA:BB:CC:DD:EE:FF.",
  });

export type MacAddress = z.infer<typeof MacAddressSchema>;
