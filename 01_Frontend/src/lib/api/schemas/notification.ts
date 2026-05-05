import { z } from "zod";

export const InboxNotificationSchema = z.object({
  id: z.number().int().positive(),
  createdAt: z.coerce.date(),
  userId: z.number().int().positive(),
  triggerEventId: z.number().int().positive().nullable(),
  title: z.string(),
  message: z.string(),
  readAt: z.coerce.date().nullable(),
});

export const InboxNotificationsResponseSchema = z.object({
  data: z.array(InboxNotificationSchema),
  totalRows: z.number().int().nonnegative(),
  pageNumber: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});

export type InboxNotification = z.infer<typeof InboxNotificationSchema>;
export type InboxNotificationsResponse = z.infer<
  typeof InboxNotificationsResponseSchema
>;
