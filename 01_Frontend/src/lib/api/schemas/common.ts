import { z } from "zod";

export const TimeOfDaySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:MM format.");

export const MacIdentifierSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/-/g, ":").toUpperCase())
  .refine((value) => /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(value), {
    message: "MAC identifier must be in the format AA:BB:CC:DD:EE:FF.",
  });

export const DeviceFingerprintSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/:/g, "").toLowerCase())
  .refine((value) => /^[0-9a-f]{64}$/.test(value), {
    message: "Invalid fingerprint format.",
  });
