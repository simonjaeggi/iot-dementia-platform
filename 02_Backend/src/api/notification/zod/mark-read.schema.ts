import { z } from "zod";

export const MarkNotificationReadSchema = z.coerce.number().int().positive();
export type MarkNotificationReadDto = z.infer<typeof MarkNotificationReadSchema>;
