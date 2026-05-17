import { and, asc, eq, isNull, lt, lte, or } from "drizzle-orm";
import { db } from "../../db/db";
import {
  userEventSubscriptions,
  userNotificationTransport,
  userNotifications,
  users,
} from "../../db/schema";
import { ExistingNotificationTransport } from "../../db/types";
import { emailService } from "../../email/email.service";
import { renderGenericEmailTemplate } from "../../email/templates/generic.template";
import { validatedEnv } from "../../env-validation";
import { pushService } from "../../push/push.service";
import { DeliveryMethod, DetailLevel } from "./zod/delivery.schema";

type PendingNotificationTransport = {
  transportId: number;
  notificationId: number;
  userEventSubscriptionId: number;
  userId: number;
  attemptCount: number;
  email: string;
  pushId: string;
  detailLevel: DetailLevel;
  title: string;
  message: string;
  deliveryMethod: DeliveryMethod;
};

type NotificationSendFailure = {
  transportId: number;
  userId: number;
  deliveryMethod: DeliveryMethod;
  message: string;
};

export type SendNotificationsResult = {
  pendingCount: number;
  sentCount: number;
  failedCount: number;
  failures: NotificationSendFailure[];
};

/**
 * Attempts to send all pending notification transports. 
 * Marks transports as sent if messaging provider returns message id.
 * @returns {Promise<SendNotificationsResult>} Result summary.
 */
export async function sendNotifications(): Promise<SendNotificationsResult> {
  await expireOldNotificationTransports();

  const transports = await getPendingNotificationTransports();
  const failures: NotificationSendFailure[] = [];
  let sentCount = 0;

  if (transports.length > 0) {
    console.info("Pending notification transports", transports.map((transport) => ({ transportId: transport.transportId, notificationId: transport.notificationId, subscriptionId: transport.userEventSubscriptionId, deliveryMethod: transport.deliveryMethod })));
  }

  for (const transport of transports) {
    try {
      await waitForSendRateLimit();

      const providerMessageId = await sendNotificationTransport(transport);
      if(!providerMessageId) throw new Error("Provider failed to return message id.");
      await markNotificationTransportSent(
        transport.transportId,
        providerMessageId,
      );
      sentCount += 1;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to send notification transport.";

      await updateNotificationTransportFailureAndDelay(transport, message);

      failures.push({
        transportId: transport.transportId,
        userId: transport.userId,
        deliveryMethod: transport.deliveryMethod,
        message,
      });
    }
  }

  return {
    pendingCount: transports.length,
    sentCount,
    failedCount: failures.length,
    failures,
  };
}

/**
 * Get pending notification transports (messages) from database.
 * @returns {Promise<PendingNotificationTransport[]>} List of pending transports
 */
async function getPendingNotificationTransports(): Promise<
  PendingNotificationTransport[]
> {
  const rows = await db
    .select({
      transportId: userNotificationTransport.id,
      notificationId: userNotificationTransport.userNotificationId,
      userEventSubscriptionId:
        userNotificationTransport.userEventSubscriptionId,
      userId: userNotifications.userId,
      attemptCount: userNotificationTransport.attemptCount,
      email: users.email,
      pushId: users.pushId,
      detailLevel: userEventSubscriptions.detailLevel,
      title: userNotifications.title,
      message: userNotifications.message,
      deliveryMethod: userEventSubscriptions.deliveryMethod,
    })
    .from(userNotificationTransport)
    .innerJoin(
      userNotifications,
      eq(userNotificationTransport.userNotificationId, userNotifications.id),
    )
    .innerJoin(
      userEventSubscriptions,
      eq(
        userNotificationTransport.userEventSubscriptionId,
        userEventSubscriptions.id,
      ),
    )
    .innerJoin(users, eq(userNotifications.userId, users.id))
    .where(
      and(
        isNull(userNotificationTransport.sentAt),
        isNull(userNotificationTransport.failedAt),
        or(
          isNull(userNotificationTransport.nextAttemptAt),
          lte(userNotificationTransport.nextAttemptAt, new Date()),
        ),
      ),
    )
    .orderBy(asc(userNotificationTransport.createdAt))
    .limit(validatedEnv.MAX_TRANSPORTS_PER_BATCH);

  return rows as PendingNotificationTransport[];
}

/**
 * Sends a pending notification transport (message).
 * @param transport Pending notification transport.
 * @returns Message id from provider, null if failed.
 */
async function sendNotificationTransport(
  transport: PendingNotificationTransport,
): Promise<string | null> {
  const content = generateMessageContent(
    transport.detailLevel,
    transport.title,
    transport.message,
  );

  switch (transport.deliveryMethod) {
    case "email":
      return sendEmailNotification(transport, content);
    case "push":
      return sendPushNotification(transport, content);
  }

  throw new Error(
    `Unsupported delivery method: ${String(transport.deliveryMethod)}`,
  );
}

/**
 * Sends a pending notification transport (message) via email.
 * @param transport Pending notification transport.
 * @returns Message id from provider, null if failed.
 */
async function sendEmailNotification(
  transport: PendingNotificationTransport,
  content: { title: string; message: string },
): Promise<string | null> {
  const html = renderGenericEmailTemplate({
    title: content.title,
    message: content.message,
    source: validatedEnv.EXTERNAL_HOST,
  });
  const text = `${content.title}\n${content.message}\n\nSource: ${validatedEnv.EXTERNAL_HOST}`;

  const result = await emailService.send({
    to: transport.email,
    subject: content.title,
    text,
    html,
  });

  return result.messageId ? result.messageId : null;
}

/**
 * Sends a pending notification transport (message) via push.
 * @param transport Pending notification transport.
 * @returns Message id from provider, null if failed.
 */
async function sendPushNotification(
  transport: PendingNotificationTransport,
  content: { title: string; message: string },
): Promise<string | null> {
  const result = await pushService.send({
    priority: "default",
    subject: content.title,
    topic: transport.pushId,
    clickUrl: `https://${validatedEnv.EXTERNAL_HOST}`,
    tags: "warning",
    text: content.message,
  });

  return result.messageId ? result.messageId : null;
}

/**
 * Marks a notification transport (message) as sent in db.
 * @param transportId Notification transport id.
 * @param providerMessageId Message id from message provider.
 * @returns {Promise<ExistingNotificationTransport>} Changed db object on success, null otherwise.
 */
async function markNotificationTransportSent(
  transportId: number,
  providerMessageId?: string,
): Promise<ExistingNotificationTransport> {
  const rows = await db
    .update(userNotificationTransport)
    .set({
      sentAt: new Date(),
      failedAt: null,
      nextAttemptAt: null,
      lastError: null,
      providerMessageId,
    })
    .where(eq(userNotificationTransport.id, transportId))
    .returning();
  return rows[0];
}

/**
 * Marks notification transports older than 24 hours as failed and expired 
 * to stop sending them.
 * @returns Number of newly expired transports.
 */
async function expireOldNotificationTransports(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db
    .update(userNotificationTransport)
    .set({
      failedAt: new Date(),
      lastError: "Expired.",
      nextAttemptAt: null,
    })
    .from(userNotifications)
    .where(
      and(
        eq(userNotificationTransport.userNotificationId, userNotifications.id),
        isNull(userNotificationTransport.sentAt),
        isNull(userNotificationTransport.failedAt),
        lt(userNotifications.createdAt, cutoff),
      ),
    )
    .returning({ id: userNotificationTransport.id });

  return rows.length;
}

/**
 * Checks if a notification transport has failed based on attempts, 
 * after 5 failed attempts, the transport is marked failed.
 * If not expired, set nextAttemptAt to one minute in the future.
 * @param transport Transport to update
 * @param message Error message
 * @returns Updated transport
 */
async function updateNotificationTransportFailureAndDelay(
  transport: PendingNotificationTransport,
  message: string,
): Promise<ExistingNotificationTransport> {
  const attemptCount = transport.attemptCount + 1;
  const isTerminal = attemptCount >= 5;

  const rows = await db
    .update(userNotificationTransport)
    .set({
      attemptCount,
      lastError: message,
      failedAt: isTerminal ? new Date() : null,
      nextAttemptAt: isTerminal
        ? null
        : new Date(Date.now() + 60 * 1000),
    })
    .where(eq(userNotificationTransport.id, transport.transportId))
    .returning();

  return rows[0];
}

/**
 * Enforces a rate limitation on transport sending.
 */
async function waitForSendRateLimit(): Promise<void> {
  const gapMs = Math.ceil(1000 / validatedEnv.MAX_TRANSPORT_SENDS_PER_SECOND);
  await new Promise((resolve) => setTimeout(resolve, gapMs));
}

/**
 * Changes title and message to match specified verbosity level.
 * @param detailLevel Detail level specified by user subscription
 * @param title Original notification transport title
 * @param message Original notification transport message text
 * @returns {{title: string, message: string}} Adjusted title and message.
 */
function generateMessageContent(
  detailLevel: string,
  title: string,
  message: string,
): { title: string; message: string } {
  switch (detailLevel) {
    case "title":
      return {
        title: title,
        message: `You have a new alert, visit https://${validatedEnv.EXTERNAL_HOST} for further information.`,
      };
    case "full":
      return {
        title: title,
        message: message,
      };
    default:
      return {
        title: "New Alert",
        message: `You have a new alert, visit https://${validatedEnv.EXTERNAL_HOST} for further information.`,
      };
  }
}
