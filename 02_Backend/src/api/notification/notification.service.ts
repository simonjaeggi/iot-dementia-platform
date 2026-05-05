import {
  and,
  count,
  desc,
  eq,
  ilike,
  isNull,
  or,
} from "drizzle-orm";
import { db } from "../../db/db";
import {
  userEventSubscriptions,
  userNotificationTransport,
  userNotifications,
} from "../../db/schema";
import {
  ExistingNotification,
  ExistingNotificationTransport,
  ExistingUserEventSubscription,
} from "../../db/types";
import { CreateNotificationDto } from "./zod/create-notification.schema";
import { CreateSubscriptionDto } from "./zod/create-subscription.schema";
import { SubscriptionId } from "./zod/subscription-id.schema";
import { SubscriptionType } from "./zod/subscription.types";

export type PaginatedNotifications = {
  data: ExistingNotification[];
  totalRows: number;
  pageNumber: number;
  pageSize: number;
};

/**
 * Returns paginated notifications for a given user
 * @param userId user
 * @param pageNumber current page that is requested
 * @param pageSize requested size of page
 * @param query string query to match against title and message 
 * @returns {Promise<PaginatedNotifications>} list of notifications with pagination data
 */
export async function getUserNotifications(
  userId: number,
  pageNumber: number,
  pageSize: number,
  query?: string,
): Promise<PaginatedNotifications> {
  const safePageSize = Math.min(Math.max(1, pageSize), 100);
  const pattern = `%${query?.trim() ?? ""}%`;
  const where = and(
    eq(userNotifications.userId, userId),
    or(
      ilike(userNotifications.title, pattern),
      ilike(userNotifications.message, pattern),
    ),
  );

  const rows = await db
    .select()
    .from(userNotifications)
    .where(where)
    .orderBy(desc(userNotifications.createdAt))
    .offset((pageNumber - 1) * safePageSize)
    .limit(safePageSize);

  const [totalRows] = await db
    .select({ count: count() })
    .from(userNotifications)
    .where(where);

  return {
    data: rows,
    totalRows: totalRows.count,
    pageNumber,
    pageSize: safePageSize,
  };
}

/**
 * Marks all unread notifications of the given user as read.
 * @param userId user id
 * @returns Number of rows updated.
 */
export async function markAllNotificationsRead(
  userId: number,
): Promise<number> {
  const now = new Date();
  const updated = await db
    .update(userNotifications)
    .set({ readAt: now })
    .where(
      and(
        eq(userNotifications.userId, userId),
        isNull(userNotifications.readAt),
      ),
    )
    .returning({ id: userNotifications.id });

  return updated.length;
}

/**
 * Deletes all notifications of the given user.
 * @param userId user id
 * @returns Number of rows deleted.
 */
export async function deleteAllNotifications(userId: number): Promise<number> {
  const deleted = await db
    .delete(userNotifications)
    .where(eq(userNotifications.userId, userId))
    .returning({ id: userNotifications.id });

  return deleted.length;
}

/**
 * Returns the event subscriptions of a user from db.
 * @param userId user id to match to db
 * @returns {Promise<ExistingUserEventSubscription[]>} List of event subscriptions
 */
export async function getUserEventSubscriptions(
  userId: number,
): Promise<ExistingUserEventSubscription[]> {
  return db
    .select()
    .from(userEventSubscriptions)
    .where(eq(userEventSubscriptions.userId, userId))
    .orderBy(desc(userEventSubscriptions.id));
}

/**
 * Stores a user event subscription in db.
 * Since subscriptions are scoped by userId, type, delivery method, detail level,
 * and optional device fingerprint, it first checks whether a subscription with
 * the same scope already exists. If yes, it updates that subscription.
 * Otherwise, it creates a new one.
 * @param userId user id
 * @param subscription subscription to store
 * @returns {Promise<ExistingUserEventSubscription | null>} Stored or updated subscription, null otherwise.
 */
export async function createUserEventSubscription(
  userId: number,
  subscription: CreateSubscriptionDto,
): Promise<ExistingUserEventSubscription | null> {
  return await db.transaction(async (tx) => {
    const [existingSubscription] = await tx
      .select({
        id: userEventSubscriptions.id,
      })
      .from(userEventSubscriptions)
      .where(
        and(
          eq(userEventSubscriptions.userId, userId),
          eq(userEventSubscriptions.type, subscription.type),
          eq(
            userEventSubscriptions.deliveryMethod,
            subscription.deliveryMethod,
          ),
          eq(userEventSubscriptions.detailLevel, subscription.detailLevel),
          subscription.deviceFingerprint
            ? eq(
                userEventSubscriptions.deviceCertFingerprintSha256,
                subscription.deviceFingerprint,
              )
            : isNull(userEventSubscriptions.deviceCertFingerprintSha256),
        ),
      )
      .limit(1);

    if (existingSubscription) {
      const [updatedSubscription] = await tx
        .update(userEventSubscriptions)
        .set({
          thresholdConfig: subscription.thresholdConfig,
        })
        .where(eq(userEventSubscriptions.id, existingSubscription.id))
        .returning();

      return updatedSubscription ?? null;
    }

    const [createdSubscription] = await tx
      .insert(userEventSubscriptions)
      .values({
        userId,
        type: subscription.type,
        deviceCertFingerprintSha256: subscription.deviceFingerprint,
        deliveryMethod: subscription.deliveryMethod,
        detailLevel: subscription.detailLevel,
        thresholdConfig: subscription.thresholdConfig,
      })
      .returning();

    return createdSubscription ?? null;
  });
}

/**
 * Deletes a user event subscription from db, both user id and subscription id must match.
 * @param userId user id
 * @param subscriptionId subscription id
 * @returns {Promise<ExistingUserEventSubscription | null>} Deleted subscription, null on failure.
 */
export async function deleteUserEventSubscription(
  userId: number,
  subscriptionId: SubscriptionId,
): Promise<ExistingUserEventSubscription | null> {
  const deleted = await db
    .delete(userEventSubscriptions)
    .where(
      and(
        eq(userEventSubscriptions.id, subscriptionId),
        eq(userEventSubscriptions.userId, userId),
      ),
    )
    .returning();

  return deleted[0] ? deleted[0] : null;
}

/**
 * Creates a new notification in db.
 * @param input notification
 * @returns {Promise<ExistingNotification | null>} Created notification, null otherwise.
 */
export async function createNotification(
  input: CreateNotificationDto,
): Promise<ExistingNotification | null> {
  const [created] = await db
    .insert(userNotifications)
    .values({
      userId: input.userId,
      title: input.title,
      message: input.message,
      triggerEventId: input.triggerEventId,
    })
    .returning();

  if (!created) return null;
  return created;
}

/**
 * Groups a list of subscriptions by their user id.
 * @param subscriptions subscriptions list
 * @returns {Map<number, ExistingUserEventSubscription[]>} Mapping between user id to subscriptions list.
 */
export function groupSubscriptionsByUser(
  subscriptions: ExistingUserEventSubscription[],
): Map<number, ExistingUserEventSubscription[]> {
  const subscriptionsByUser = new Map<number, ExistingUserEventSubscription[]>();

  for (const subscription of subscriptions) {
    const existingSubscriptions = subscriptionsByUser.get(subscription.userId);
    if (existingSubscriptions) {
      existingSubscriptions.push(subscription);
      continue;
    }
    subscriptionsByUser.set(subscription.userId, [subscription]);
  }

  return subscriptionsByUser;
}

/**
 * Creates a new notification for a list of users. The subscriptions responsible must be mapped to
 * the user id to create the transport instances.
 * @param subscriptionsByUser user id to subscription map
 * @param content notification content
 * @param triggerEventId id of triggering event
 */
export async function createNotificationsForUsers(
  subscriptionsByUser: Map<number, ExistingUserEventSubscription[]>,
  content: { title: string; message: string },
  triggerEventId: number | null,
) {
  for (const [userId, userSubscriptions] of subscriptionsByUser) {
    const notification = await createNotification({
      userId,
      title: content.title,
      message: content.message,
      triggerEventId,
    });

    if (!notification) {
      continue;
    }

    await createNotificationTransportInstances(
      notification.id,
      userSubscriptions,
    );
  }
}

/**
 * Marks a notification as read if it has not been marked yet.
 * User id and notification id must match.
 * @param userId user id
 * @param notificationId notification id
 * @returns {Promise<ExistingNotification | null>} Updated notification on update success, null otherwise (including already marked).
 */
export async function markNotificationRead(
  userId: number,
  notificationId: number,
): Promise<ExistingNotification | null> {
  const now = new Date();

  const rows = await db
    .update(userNotifications)
    .set({ readAt: now })
    .where(
      and(
        eq(userNotifications.userId, userId),
        eq(userNotifications.id, notificationId),
        isNull(userNotifications.readAt),
      ),
    )
    .returning();

  return rows[0];
}

/**
 * Creates a notification transport for every subscription of a notification.
 * @param notificationId id of notification
 * @param subscriptions list of subscriptions for the reference notification.
 * @returns {Promise<ExistingNotificationTransport[]>} List of stored notification transports.
 */
async function createNotificationTransportInstances(
  notificationId: number,
  subscriptions: ExistingUserEventSubscription[],
): Promise<ExistingNotificationTransport[]> {
  if (subscriptions.length === 0) {
    return [];
  }

  return await db
    .insert(userNotificationTransport)
    .values(
      subscriptions.map((subscription) => ({
        userNotificationId: notificationId,
        userEventSubscriptionId: subscription.id,
      })),
    )
    .returning();
}

/**
 * Returns a list of user event subscriptions that match a given type.
 * @param type type to match
 */
export async function getSubscriptionsByType(
  type: SubscriptionType,
): Promise<ExistingUserEventSubscription[]> {
  const subscriptionRows = await db
    .select()
    .from(userEventSubscriptions)
    .where(eq(userEventSubscriptions.type, type));
  return subscriptionRows;
}
