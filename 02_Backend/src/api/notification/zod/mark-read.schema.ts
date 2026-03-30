import { z } from "zod";

export const MarkNotificationReadSchema = z
  .object({
    userId: z.number().int().positive(),
    notificationId: z.number().int().positive(),
  })
  .strict();

export type MarkNotificationReadDto = z.infer<
  typeof MarkNotificationReadSchema
>;
