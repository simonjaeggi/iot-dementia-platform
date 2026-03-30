import { z } from "zod";

export const LocationBeaconIdSchema = z.coerce.number().int().positive();

export type LocationBeaconId = z.infer<typeof LocationBeaconIdSchema>;
