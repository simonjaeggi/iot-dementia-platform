import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "../../db/db";
import {
  userEventSubscriptions,
  userNotificationTransport,
  userNotifications,
} from "../../db/schema";
import { EventDto } from "../event/zod/event.schema";
import { CreateNotificationDto } from "./zod/notification-create.schema";
import { CreateNotificationSubscriptionDto } from "./zod/notification-subscription-create.schema";
import { GetUserNotificationsDto } from "./zod/notification-get-by-user.schema";
import { NotificationSubscriptionId } from "./zod/notification-subscription-id.schema";

type NotificationRecord = CreateNotificationDto & {
  id: number;
  createdAt: Date;
  readAt: Date | null;
};

type UserSubscriptionMap = {
  id: number;
  userId: number;
};

export type StoredNotification = Omit<NotificationRecord, "userId">;
export type StoredUserEventSubscription = Pick<
  typeof userEventSubscriptions.$inferSelect,
  "id" | "eventType" | "deliveryMethod" | "detailLevel"
>;

export async function getUserNotifications(
  input: GetUserNotificationsDto,
): Promise<StoredNotification[]> {
  const rows = await db
    .select({
      id: userNotifications.id,
      createdAt: userNotifications.createdAt,
      title: userNotifications.title,
      message: userNotifications.message,
      triggerEventId: userNotifications.triggerEventId,
      readAt: userNotifications.readAt,
    })
    .from(userNotifications)
    .where(eq(userNotifications.userId, input.userId))
    .orderBy(desc(userNotifications.createdAt));

  return rows;
}

export async function getUserEventSubscriptions(
  userId: number,
): Promise<StoredUserEventSubscription[]> {
  return db
    .select({
      id: userEventSubscriptions.id,
      eventType: userEventSubscriptions.eventType,
      deliveryMethod: userEventSubscriptions.deliveryMethod,
      detailLevel: userEventSubscriptions.detailLevel,
    })
    .from(userEventSubscriptions)
    .where(eq(userEventSubscriptions.userId, userId))
    .orderBy(desc(userEventSubscriptions.id));
}

export async function createUserEventSubscription(
  userId: number,
  input: CreateNotificationSubscriptionDto,
): Promise<StoredUserEventSubscription | null> {
  const [createdSubscription] = await db
    .insert(userEventSubscriptions)
    .values({
      userId,
      eventType: input.eventType,
      deliveryMethod: input.deliveryMethod,
      detailLevel: input.detailLevel,
    })
    .onConflictDoNothing({
      target: [
        userEventSubscriptions.userId,
        userEventSubscriptions.eventType,
        userEventSubscriptions.deliveryMethod,
        userEventSubscriptions.detailLevel,
      ],
    })
    .returning({
      id: userEventSubscriptions.id,
      eventType: userEventSubscriptions.eventType,
      deliveryMethod: userEventSubscriptions.deliveryMethod,
      detailLevel: userEventSubscriptions.detailLevel,
    });

  if (createdSubscription) {
    return createdSubscription;
  }

  const [existingSubscription] = await db
    .select({
      id: userEventSubscriptions.id,
      eventType: userEventSubscriptions.eventType,
      deliveryMethod: userEventSubscriptions.deliveryMethod,
      detailLevel: userEventSubscriptions.detailLevel,
    })
    .from(userEventSubscriptions)
    .where(
      and(
        eq(userEventSubscriptions.userId, userId),
        eq(userEventSubscriptions.eventType, input.eventType),
        eq(userEventSubscriptions.deliveryMethod, input.deliveryMethod),
        eq(userEventSubscriptions.detailLevel, input.detailLevel),
      ),
    )
    .limit(1);

  return existingSubscription ?? null;
}

export async function deleteUserEventSubscription(
  userId: number,
  subscriptionId: NotificationSubscriptionId,
): Promise<boolean> {
  const deleted = await db
    .delete(userEventSubscriptions)
    .where(
      and(
        eq(userEventSubscriptions.id, subscriptionId),
        eq(userEventSubscriptions.userId, userId),
      ),
    )
    .returning({ id: userEventSubscriptions.id });

  return deleted.length > 0;
}

export async function createNotification(
  input: CreateNotificationDto,
): Promise<StoredNotification | null> {
  const [created] = await db
    .insert(userNotifications)
    .values({
      userId: input.userId,
      title: input.title,
      message: input.message,
      triggerEventId: input.triggerEventId,
    })
    .returning({
      id: userNotifications.id,
      createdAt: userNotifications.createdAt,
      userId: userNotifications.userId,
      title: userNotifications.title,
      message: userNotifications.message,
      triggerEventId: userNotifications.triggerEventId,
      readAt: userNotifications.readAt,
    });

  if (!created) return null;

  const { userId: _userId, ...storedNotification } = created;
  return storedNotification;
}

export async function mapEventToNotifications(
  eventId: number,
  event: EventDto,
): Promise<void> {
  const subscriptions = await db
    .select({
      id: userEventSubscriptions.id,
      userId: userEventSubscriptions.userId,
    })
    .from(userEventSubscriptions)
    .where(eq(userEventSubscriptions.eventType, event.type));

  const subscriptionsByUser = new Map<number, UserSubscriptionMap[]>();

  for (const subscription of subscriptions) {
    const existing = subscriptionsByUser.get(subscription.userId);
    if (existing) {
      existing.push(subscription);
    } else {
      subscriptionsByUser.set(subscription.userId, [subscription]);
    }
  }

  for (const [userId, userSubscriptions] of subscriptionsByUser) {
    const content = buildNotificationContent(event);

    const notification = await createNotification({
      userId,
      title: content.title,
      message: content.message,
      triggerEventId: eventId,
    });

    if (notification) {
      await createNotificationTransportInstances(
        notification,
        userSubscriptions,
      );
    }
  }
}

export async function markNotificationRead(
  userId: number,
  notificationId: number,
): Promise<boolean> {
  const now = new Date();

  const updated = await db
    .update(userNotifications)
    .set({ readAt: now })
    .where(
      and(
        eq(userNotifications.userId, userId),
        eq(userNotifications.id, notificationId),
        isNull(userNotifications.readAt),
      ),
    )
    .returning({ id: userNotifications.id });

  return updated.length > 0;
}

function buildNotificationContent(event: EventDto): {
  title: string;
  message: string;
} {
  const title = `Event: ${event.type}`;
  let message = `A ${event.type} event was recorded at ${formatNotificationTimestamp(event.time)}.`;

  const formattedDetails = formatEventDetails(event);

  if (formattedDetails) {
    message += `\n\n${formattedDetails}`;
  }

  return { title, message };
}

function formatNotificationTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("de-CH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Europe/Zurich",
    timeZoneName: "short",
  }).format(date);
}

function formatEventDetails(event: EventDto): string | null {
  switch (event.type) {
    case "login":
    case "register":
      return `User ID: ${event.data.user.id} \nEmail: ${event.data.user.email}`
    case "temperature":
      return `Temperature: ${event.data.value} ${event.data.unit}`;
    default:
      if ("data" in event) {
        return JSON.stringify(event.data, null, 2);
      }

      return null;
  }
}

async function createNotificationTransportInstances(
  notification: StoredNotification,
  subscriptions: UserSubscriptionMap[],
): Promise<void> {
  if (subscriptions.length === 0) {
    return;
  }

  await db.insert(userNotificationTransport).values(
    subscriptions.map((subscription) => ({
      userNotificationId: notification.id,
      userEventSubscriptionId: subscription.id,
    })),
  );
}
