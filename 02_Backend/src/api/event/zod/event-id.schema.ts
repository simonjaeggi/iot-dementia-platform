import { z } from "zod";

export const EventIdSchema = z.coerce.number().int().positive();

export type EventIdDto = z.infer<typeof EventIdSchema>;
