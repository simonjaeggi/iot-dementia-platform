import { eq, and, gte } from "drizzle-orm";
import { db } from "../../../db/db";
import {
  userEventSubscriptions,
  userNotifications,
  userNotificationTransport,
} from "../../../db/schema";
import { formatSwissTimestamp } from "../../../shared/utils";
import { EventDto } from "../../event/zod/event.schema";
import {
  createNotificationsForUsers,
  groupSubscriptionsByUser,
} from "../notification.service";
import { isStatelessSubscriptionType } from "../zod/subscription.types";
import { matchesStatelessThreshold } from "./stateless-notification-threshold.service";

/**
 * Checks if a stateless event matches with a user subscription. On match, create notification for subscribed users.
 * @param eventId DB Event id, is stored as triggerEventId in the notification for later reference.
 * @param event Event to check for subscriptions and create notifications and transports.
 */
export async function processStatelessNotifications(
  eventId: number,
  event: EventDto,
): Promise<void> {
  if (!isStatelessSubscriptionType(event.type)) {
    return;
  }

  const subscriptions = await db
    .select()
    .from(userEventSubscriptions)
    .where(eq(userEventSubscriptions.type, event.type));

  const matchingSubscriptions = subscriptions.filter(
    (subscription) =>
      matchesSubscriptionDeviceScope(
        event,
        subscription.deviceCertFingerprintSha256,
      ) &&
      matchesStatelessThreshold(event, subscription.thresholdConfig ?? null),
  );

  await createNotificationsForUsers(
    groupSubscriptionsByUser(matchingSubscriptions),
    buildStatelessNotificationContent(event),
    eventId,
  );
}

/**
 * Helper function that checks if a given event was created by a device.
 * @param event event
 * @param deviceFingerprint device fingerprint
 * @returns true if fingerprint matches or is null, false otherwise.
 */
function matchesSubscriptionDeviceScope(
  event: EventDto,
  deviceFingerprint: string | null,
): boolean {
  if (!deviceFingerprint) {
    return true;
  }

  return (
    event.source.kind === "device" &&
    event.source.deviceFingerprint === deviceFingerprint
  );
}

/**
 * Formats event information into message and title that are readable by a user.
 * @param event
 * @returns {{ title: string; message: string }} Object containing the title and message for a user notification.
 */
function buildStatelessNotificationContent(event: EventDto): {
  title: string;
  message: string;
} {
  const title = `Event: ${event.type}`;
  let message = `A ${event.type} event was recorded at ${formatSwissTimestamp(event.time)}.`;

  const formattedDetails = formatStatelessNotificationDetails(event);

  if (formattedDetails) {
    message += `\n\n${formattedDetails}`;
  }

  return { title, message };
}

/**
 * Formats event-specific details for notification messages.
 * @param event Event to format details for.
 * @returns Formatted event details, or null if no details should be shown.
 */
function formatStatelessNotificationDetails(event: EventDto): string | null {
  switch (event.type) {
    case "login":
      return `The user with email ${event.data.user.email} logged into the system.`;
    case "register":
      return `A new user was registered using the email: ${event.data.user.email}.`;
    case "temperature":
      return `Temperature: ${event.data.value} ${event.data.unit}`;
    default:
      if ("data" in event) {
        return JSON.stringify(event.data, null, 2);
      }

      return null;
  }
}

/**
 * Checks if a subscription has triggered a notification since a certain time.
 * @param subscriptionId
 * @param time
 * @returns True if it has, false otherwise.
 */
export async function hasSubscriptionTriggeredNotificationSinceTime(
  subscriptionId: number,
  time: Date,
): Promise<boolean> {
  const rows = await db
    .select({ id: userNotificationTransport.id })
    .from(userNotificationTransport)
    .innerJoin(
      userNotifications,
      eq(userNotificationTransport.userNotificationId, userNotifications.id),
    )
    .where(
      and(
        eq(userNotificationTransport.userEventSubscriptionId, subscriptionId),
        gte(userNotifications.createdAt, time),
      ),
    )
    .limit(1);

  return !!rows[0];
}
