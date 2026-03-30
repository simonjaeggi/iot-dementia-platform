import { z } from "zod";

export const CreateNotificationSchema = z
  .object({
    userId: z.number().int().positive(),
    title: z
      .string()
      .trim()
      .min(1, "Title is required.")
      .max(128, "Title cannot be longer than 128 characters."),
    message: z.string().trim().min(1, "Message is required."),
    triggerEventId: z.number().int().positive().nullable(),
  })
  .strict();

export type CreateNotificationDto = z.infer<typeof CreateNotificationSchema>;
