import { z } from "zod";

export const GetUserNotificationsSchema = z
  .object({
    userId: z.number().int().positive(),
  })
  .strict();

export type GetUserNotificationsDto = z.infer<
  typeof GetUserNotificationsSchema
>;
