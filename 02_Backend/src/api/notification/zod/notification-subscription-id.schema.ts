import { z } from "zod";

export const NotificationSubscriptionIdSchema = z.coerce.number().int().positive();

export type NotificationSubscriptionId = z.infer<
  typeof NotificationSubscriptionIdSchema
>;
