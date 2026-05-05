import { eq, getTableColumns } from "drizzle-orm";
import { db } from "../../../db/db";
import {
  createNotificationsForUsers,
  getSubscriptionsByType,
  groupSubscriptionsByUser,
} from "../notification.service";
import { devices, infrastructureStates } from "../../../db/schema";
import {
  formatDurationFromSeconds,
  formatSwissTimestamp,
} from "../../../shared/utils";
import { InfrastructureStateDurationThresholdConfig } from "../zod/threshold.schema";
import {
  ExistingInfrastructureState,
  ExistingUserEventSubscription,
} from "../../../db/types";
import { hasSubscriptionTriggeredNotificationSinceTime } from "../stateless/stateless-notification.service";
type InfrastructureStateWithDeviceName = ExistingInfrastructureState & {
  deviceName: string | null;
};
type UserEventSubscriptionWithInfrastructureStateDuration =
  ExistingUserEventSubscription & {
    thresholdConfig: InfrastructureStateDurationThresholdConfig;
  };
/**
 * Checks infrastructure states against matching subscriptions.
 * If a subscription matches a state and has not already caused a notification
 * since the current state began, creates a new notification.
 * @param now current date to check threshold reached, defaults to new Date()
 */
export async function processInfrastructureNotifications(
  now: Date = new Date(),
): Promise<void> {
  const states = await getInfrastrutureStates();
  if (states.length === 0) return;
  const subscriptionRows = await getSubscriptionsByType(
    "infrastructureStatusTooLong",
  );
  const subscriptions = subscriptionRows.filter(
    isInfrastructureStateDurationSubscription,
  ) as UserEventSubscriptionWithInfrastructureStateDuration[];

  for (const state of states) {
    const dueSubscriptions = subscriptions.filter(
      (subscription) =>
        (subscription.deviceCertFingerprintSha256 === null ||
          subscription.deviceCertFingerprintSha256 ===
            state.deviceCertFingerprintSha256) &&
        subscription.thresholdConfig.status === state.status &&
        new Date(
          state.statusSince.getTime() +
            subscription.thresholdConfig.durationSeconds * 1000,
        ) <= now,
    );

    if (dueSubscriptions.length === 0) {
      continue;
    }

    const pendingSubscriptions: ExistingUserEventSubscription[] = [];

    for (const subscription of dueSubscriptions) {
      if (
        await hasSubscriptionTriggeredNotificationSinceTime(
          subscription.id,
          state.statusSince,
        )
      ) {
        continue;
      }

      pendingSubscriptions.push(subscription);
    }

    if (pendingSubscriptions.length === 0) {
      continue;
    }

    await createNotificationsForUsers(
      groupSubscriptionsByUser(pendingSubscriptions),
      buildInfrastructureNotificationContent(state, now),
      state.lastEventId,
    );
  }
}

/**
 * Checks if a subscription is a state duration subscription based on the threshold object in db.
 * @param subscription subscription to check
 * @returns true if category is infrastructureStateDuration, false otherwise
 */
function isInfrastructureStateDurationSubscription(
  subscription: ExistingUserEventSubscription,
) {
  if (!subscription.thresholdConfig || !subscription.thresholdConfig.category)
    return false;
  return (
    subscription.thresholdConfig?.category === "infrastructureStateDuration"
  );
}

/**
 * Formats state information into message and title that are readable by a user.
 * @param state infrastructure state
 * @param now Reference timestamp to compute elapsed seconds
 * @returns {{ title: string; message: string }} Object containing the title and message for a user notification.
 */
function buildInfrastructureNotificationContent(
  state: InfrastructureStateWithDeviceName,
  now: Date,
): { title: string; message: string } {
  const deviceLabel =
    state.deviceName?.trim() || state.deviceCertFingerprintSha256.slice(0, 6);
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now.getTime() - state.statusSince.getTime()) / 1000),
  );

  return {
    title: `Infrastructure ${state.status} too long`,
    message:
      `Infrastructure on ${deviceLabel} has remained ${state.status} since ` +
      `${formatSwissTimestamp(state.statusSince)} ` +
      `(${formatDurationFromSeconds(elapsedSeconds)}).`,
  };
}

/**
 * Reads all infrastructure states from db, enriches them with device name and returns the list.
 * @returns {Promise<InfrastructureStateWithDeviceName[]>} List of infrastructure states
 */
export async function getInfrastrutureStates(): Promise<
  InfrastructureStateWithDeviceName[]
> {
  const statesWithDevice = await db
    .select({
      ...getTableColumns(infrastructureStates),
      deviceName: devices.name,
    })
    .from(infrastructureStates)
    .leftJoin(
      devices,
      eq(
        infrastructureStates.deviceCertFingerprintSha256,
        devices.certFingerprintSha256,
      ),
    );

  return statesWithDevice;
}
