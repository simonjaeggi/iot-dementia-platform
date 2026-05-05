import { z } from "zod";
import { FingerprintSchema } from "./cert-fingerprint.schema";

export const DeviceTypeSchema = z.union([
  z.literal("environmentStation"),
  z.literal("infrastructureStation"),
  z.literal("personStation"),
]);

export const SetDeviceTypeSchema = z.object({
  fingerprint: FingerprintSchema,
  deviceType: DeviceTypeSchema,
});

export type DeviceTypeDto = z.infer<typeof DeviceTypeSchema>;
export type SetDeviceTypeDto = z.infer<typeof SetDeviceTypeSchema>;
