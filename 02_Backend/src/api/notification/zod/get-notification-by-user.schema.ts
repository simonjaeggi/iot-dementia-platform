import { z } from "zod";

export const GetUserNotificationsSchema = z
  .object({
    pageNumber: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(25),
    query: z.string().trim().max(200).optional(),
  })
  .strict();

export type GetUserNotificationsDto = z.infer<
  typeof GetUserNotificationsSchema
>;
