import { eq } from "drizzle-orm";
import { db } from "../../../db/db";
import { userEventSubscriptions } from "../../../db/schema";
import { formatSwissTimestamp } from "../../../shared/utils";
import { EventDto } from "../../event/zod/event.schema";
import {
  claimNotificationMarker,
  createNotificationsForUsers,
  groupSubscriptionsByUser,
} from "../notification.service";
import {
  isRateLimitedSubscriptionType,
  isStatelessSubscriptionType,
  StatelessSubscriptionType,
} from "../zod/subscription.types";
import { matchesStatelessThreshold } from "./stateless-notification-threshold.service";
import { getDevice } from "../../device/device.web.service";
import { validatedEnv } from "../../../env-validation";
import { ExistingUserEventSubscription } from "../../../db/types";

/**
 * Checks if a stateless event matches with a user subscription. 
 * On match, check if the event has already been sent in the current 
 * deduplication window if the event type is rate limited. 
 * Create outstanding notifications.
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
    .where(
      eq(userEventSubscriptions.type, event.type as StatelessSubscriptionType),
    );

  const matchingSubscriptions = subscriptions.filter(
    (subscription) =>
      matchesSubscriptionDeviceScope(
        event,
        subscription.deviceCertFingerprintSha256,
      ) &&
      matchesStatelessThreshold(event, subscription.thresholdConfig ?? null),
  );

  const triggerKey = buildSensorTriggerKey(event);
  const subscriptionsToNotify: ExistingUserEventSubscription[] = [];
  for (const subscription of matchingSubscriptions) {
    if (triggerKey === null) {
      subscriptionsToNotify.push(subscription);
      continue;
    }
    if (
      await claimNotificationMarker(subscription.id, triggerKey.key, triggerKey.expiresAt)
    ) {
      subscriptionsToNotify.push(subscription);
    }
  }

  if (subscriptionsToNotify.length === 0) {
    return;
  }

  await createNotificationsForUsers(
    groupSubscriptionsByUser(subscriptionsToNotify),
    await buildStatelessNotificationContent(event),
    eventId,
  );
}

/**
 * Builds a notification trigger key for noisy sensor events using a fixed
 * time bucket. Returns null for event types that should not be bucketed.
 * @param event Stateless event
 * @returns Trigger key and expiry, or null if event type is not rate limited.
 */
function buildSensorTriggerKey(
  event: EventDto,
): { key: string; expiresAt: Date } | null {
  if (!isRateLimitedSubscriptionType(event.type)) {
    return null;
  }

  const deduplicationTimeDuration = validatedEnv.SENSOR_NOTIFICATION_WINDOW_SECONDS * 1000;
  const timeBucket = Math.floor(event.time.getTime() / deduplicationTimeDuration);
  const deviceFingerprint =
    event.source.kind === "device" ? event.source.deviceFingerprint : "any";

  return {
    key: `${event.type}:dev=${deviceFingerprint}:bucket=${timeBucket}`,
    expiresAt: new Date((timeBucket + 1) * deduplicationTimeDuration),
  };
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
  if (deviceFingerprint === null || deviceFingerprint === "") {
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
async function buildStatelessNotificationContent(event: EventDto): Promise<{
  title: string;
  message: string;
}> {
  const title = `Event: ${event.type}`;
  let message = `You have a new notification. The following event was recorded at ${formatSwissTimestamp(event.time)}.`;
  let device;
  if (event.source.kind === "device") {
    device = await getDevice(event.source.deviceFingerprint);
  }
  const deviceName = device?.name ? device.name : null;
  const formattedDetails = formatStatelessNotificationDetails(
    event,
    deviceName,
  );

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
function formatStatelessNotificationDetails(
  event: EventDto,
  deviceName: string | null,
): string | null {
  switch (event.type) {
    case "login":
      return `${event.data.user.email} logged in.`;
    case "register":
      return `${event.data.user.email} registered a new account.`;
    case "passwordChange":
      return `${event.data.user.email} changed their password.`;
    case "roleChange":
      return `${event.data.user.email} changed ${event.data.changedUser.email}'s role from ${event.data.fromRole} to ${event.data.toRole}.`;
    case "userDelete":
      return `${event.data.user.email} deleted the account for ${event.data.deletedUser.email}.`;
    case "accessCode":
      return `${event.data.user.email} ${event.data.action} access code #${event.data.codeId}.`;
    case "corruptDeviceConfig":
      return `A device rejected the new configuration and fell back to version ${event.data.fallbackVersion}.`;
    case "temperature":
      return `The temperature is ${event.data.value} ${event.data.unit}.`;
    case "lightIntensity":
      return `The light level is ${event.data.lux} lux.`;
    case "noiseLevel":
      return `The noise level is about ${event.data.approx_db} dB. Raw microphone level: ${event.data.dbfs} dBFS.`;
    case "humidity":
      return `The humidity is ${event.data.percentage}%.`;
    case "infrastructure":
      return `Infrastructure is currently ${event.data.status}.`;
    case "updateAvailable":
      return `Version ${event.data.version} is available for devices.`;
    case "systemBoot": {
      if (event.source.kind === "device") {
        return `Device ${deviceName || "Unnamed Device"} has just started.`;
      }
      return "A device has just started.";
    }
    default:
      if ("data" in event) {
        return JSON.stringify(event.data, null, 2);
      }

      return null;
  }
}
