import { Context } from "hono";
import { getUserIdFromJwt } from "../auth/auth.middleware";
import {
  createUserEventSubscription,
  deleteUserEventSubscription,
  getUserEventSubscriptions,
  getUserNotifications,
} from "./notification.service";
import { HTTPException } from "hono/http-exception";
import { CreateSubscriptionSchema } from "./zod/subscription-create.schema";
import { SubscriptionIdSchema } from "./zod/subscription-id.schema";

/**
 * Returns notifications for the authenticated user.
 * @param c HTTP context
 * @returns HTTP JSON response containing a list of notifications.
 * @throws {HTTPException} 401 invalid user context
 */
export async function notifications(c: Context) {
  const userId = getUserIdFromJwt(c);
  const notifications = await getUserNotifications(userId);
  return c.json({ notifications });
}

/**
 * Returns notification subscriptions for the authenticated user.
 * @param c HTTP context
 * @returns HTTP JSON response containing a list of notification subscriptions.
 * @throws {HTTPException} 401 invalid user context
 */
export async function notificationSubscriptions(c: Context) {
  const userId = getUserIdFromJwt(c);
  const subscriptions = await getUserEventSubscriptions(userId);
  return c.json({ subscriptions });
}

/**
 * Creates a new notification subscription in db.
 * @param c HTTP context
 * @returns Stored db subscription.
 * @throws {HTTPException} 401 invalid user context
 * @throws {HTTPException} 400 Invalid payload
 * @throws {HTTPException} 500 Db creation failed
 */
export async function subscribeToNotifications(c: Context) {
  const userId = getUserIdFromJwt(c);
  const body = await c.req.json().catch(() => null);
  const dtoResult = CreateSubscriptionSchema.safeParse(body);

  if (!dtoResult.success) {
    throw new HTTPException(400, {
      message: dtoResult.error.issues[0]?.message ?? "Invalid payload.",
    });
  }

  const subscription = await createUserEventSubscription(
    userId,
    dtoResult.data,
  );

  if (!subscription) {
    throw new HTTPException(500, { message: "Failed to create subscription." });
  }

  return c.json({ subscription });
}

/**
 * Deletes a notification subscription from db.
 * @param c HTTP context
 * @returns {ok: true}
 * @throws {HTTPException} 401 Invalid user context
 * @throws {HTTPException} 400 Invalid subscription id payload
 * @throws {HTTPException} 404 Subscription not found
 * @throws {HTTPException} 500 Db creation failed
 */
export async function unsubscribeFromNotifications(c: Context) {
  const userId = getUserIdFromJwt(c);
  const subscriptionIdResult = SubscriptionIdSchema.safeParse(
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
