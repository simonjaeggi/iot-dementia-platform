import { z } from "zod";

function normaliseMacIdentifier(value: string): string {
  return value.trim().replace(/-/g, ":").toUpperCase();
}

export const MacIdentifierSchema = z
  .string()
  .transform(normaliseMacIdentifier)
  .refine((value) => /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(value), {
    message:
      "MAC identifier must be in the format AA:BB:CC:DD:EE:FF.",
  });

export type MacIdentifier = z.infer<typeof MacIdentifierSchema>;
