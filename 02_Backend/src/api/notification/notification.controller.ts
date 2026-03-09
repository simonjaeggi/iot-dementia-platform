import { Context } from "hono";
import { getUserIdFromJwt } from "../auth/auth.middleware";
import {
  createUserEventSubscription,
  deleteUserEventSubscription,
  getUserEventSubscriptions,
  getUserNotifications,
} from "./notification.service";
import { HTTPException } from "hono/http-exception";
import { CreateNotificationSubscriptionSchema } from "./zod/notification-subscription-create.schema";
import { NotificationSubscriptionIdSchema } from "./zod/notification-subscription-id.schema";

/**
 * Returns notifications for the authenticated user.
 * @param c HTTP context
 * @returns HTTP JSON response containing a list of notifications.
 * @throws {HTTPException} 401 invalid user context
 */
export async function notifications(c: Context) {
  const userId = getUserIdFromJwt(c);
  const notifications = await getUserNotifications({ userId });
  return c.json({ notifications });
}

export async function notificationSubscriptions(c: Context) {
  const userId = getUserIdFromJwt(c);
  const subscriptions = await getUserEventSubscriptions(userId);
  return c.json({ subscriptions });
}

export async function subscribeToNotifications(c: Context) {
  const userId = getUserIdFromJwt(c);
  const body = await c.req.json().catch(() => null);
  const dtoResult = CreateNotificationSubscriptionSchema.safeParse(body);

  if (!dtoResult.success) {
    throw new HTTPException(400, {
      message: dtoResult.error.issues[0]?.message ?? "Invalid payload.",
    });
  }

  const subscription = await createUserEventSubscription(userId, dtoResult.data);

  if (!subscription) {
    throw new HTTPException(500, { message: "Failed to create subscription." });
  }

  return c.json({ subscription });
}

export async function unsubscribeFromNotifications(c: Context) {
  const userId = getUserIdFromJwt(c);
  const subscriptionIdResult = NotificationSubscriptionIdSchema.safeParse(
    c.req.param("id"),
  );

  if (!subscriptionIdResult.success) {
    throw new HTTPException(400, { message: "Invalid subscription id." });
  }

  const deleted = await deleteUserEventSubscription(
    userId,
    subscriptionIdResult.data,
  );

  if (!deleted) {
    throw new HTTPException(404, { message: "Subscription not found." });
  }

  return c.json({ ok: true });
}
