import { z } from "zod";
import {
  NotificationDeliveryMethodSchema,
  NotificationDetailLevelSchema,
} from "./notification-subscription.schema";
import { EventSchema } from "../../event/zod/event.schema";

const eventTypeValues = EventSchema.options.map((eventSchema) => {
  const typeLiteral = eventSchema.shape.type;
  return typeLiteral.value;
}) as [string, ...string[]];

export const NotificationSubscriptionEventTypeSchema = z.enum(eventTypeValues);

export const CreateNotificationSubscriptionSchema = z
  .object({
    eventType: NotificationSubscriptionEventTypeSchema,
    deliveryMethod: NotificationDeliveryMethodSchema,
    detailLevel: NotificationDetailLevelSchema,
  })
  .strict();

export type CreateNotificationSubscriptionDto = z.infer<
  typeof CreateNotificationSubscriptionSchema
>;
