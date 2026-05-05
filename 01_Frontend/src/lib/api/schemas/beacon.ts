import { z } from "zod";
import { MacIdentifierSchema } from "./common";

export const LocationBeaconSchema = z.object({
  id: z.number().int().positive(),
  createdAt: z.coerce.date(),
  displayName: z.string(),
  macIdentifier: MacIdentifierSchema,
});

export const CreateLocationBeaconSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required.")
    .max(255, "Display name cannot be longer than 255 characters."),
  macIdentifier: MacIdentifierSchema,
});

export const LocationBeaconsResponseSchema = z.object({
  beacons: z.array(LocationBeaconSchema),
});

export const LocationBeaconResponseSchema = z.object({
  beacon: LocationBeaconSchema,
});

export const LocationBeaconIdSchema = z.number().int().positive();

export type LocationBeacon = z.infer<typeof LocationBeaconSchema>;
export type CreateLocationBeacon = z.infer<typeof CreateLocationBeaconSchema>;
