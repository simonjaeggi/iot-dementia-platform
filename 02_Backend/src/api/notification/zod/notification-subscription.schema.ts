import { z } from "zod";

export const NotificationDeliveryMethodSchema = z.enum(["email"]);

export type NotificationDeliveryMethod = z.infer<
  typeof NotificationDeliveryMethodSchema
>;

export const NotificationDetailLevelSchema = z.enum([
  "none",
  "title",
  "full",
]);

export type NotificationDetailLevel = z.infer<
  typeof NotificationDetailLevelSchema
>;
