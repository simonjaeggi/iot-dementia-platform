import { z } from "zod";
import { DeviceFingerprintSchema } from "./common";
import { InfrastructureStatusSchema } from "./device";

export const InfrastructureStateSchema = z.object({
  fingerprint: DeviceFingerprintSchema,
  deviceName: z.string().nullable(),
  status: InfrastructureStatusSchema,
  statusSince: z.coerce.date(),
  lastObserved: z.coerce.date(),
});

export const InfrastructureStatesResponseSchema = z.object({
  states: z.array(InfrastructureStateSchema),
});

export type InfrastructureState = z.infer<typeof InfrastructureStateSchema>;
