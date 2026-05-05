import { eq, getTableColumns } from "drizzle-orm";
import { db } from "../../../db/db";
import {
  devices,
  fallDetectionStates,
  locationBeacons,
} from "../../../db/schema";
import {
  createNotificationsForUsers,
  getSubscriptionsByType,
  groupSubscriptionsByUser,
} from "../notification.service";
import {
  formatDeviceReference,
  formatDurationFromSeconds,
  formatPatientLabel,
  formatSwissTimestamp,
} from "../../../shared/utils";
import {
  ExistingFallDetectionState,
  ExistingUserEventSubscription,
} from "../../../db/types";
import { FallDetectionThresholdConfig } from "../zod/threshold.schema";
import { hasSubscriptionTriggeredNotificationSinceTime } from "../stateless/stateless-notification.service";
import { getPatient } from "../../misc/misc.service";

type FallDetectionStateWithLabels = ExistingFallDetectionState & {
  deviceName: string | null;
  triggerBeaconDisplayName: string | null;
};

type UserEventSubscriptionWithFallDetection = ExistingUserEventSubscription & {
  thresholdConfig: FallDetectionThresholdConfig;
};

/**
 * Checks fall detection states against matching subscriptions.
 * If a subscription matches a state and has not already caused a notification
 * since the current fall candidate began, creates a new notification.
 * @param now current date to check threshold reached, defaults to new Date()
 */
export async function processFallDetectionNotifications(
  now: Date = new Date(),
): Promise<void> {
  const states = await getFallDetectionStates();
  if (states.length === 0) return;

  const patient = await getPatient();
  const patientLabel = formatPatientLabel(patient?.surname);

  const subscriptionRows = await getSubscriptionsByType("fallDetection");
  const subscriptions = subscriptionRows.filter(
    isFallDetectionSubscription,
  ) as UserEventSubscriptionWithFallDetection[];

  // go through each state stored in the fall table, skip if a candidate is not fully defined
  for (const state of states) {
    if (
      state.candidateStartedAt === null ||
      state.triggerAccelerationMagnitudeG === null ||
      state.triggerAccelerationEventId === null ||
      state.lastObservedBeaconMacIdentifier !== state.triggerBeaconMacIdentifier
    ) {
      continue;
    }

    const candidateStartedAt = state.candidateStartedAt;
    const triggerAccelerationMagnitudeG = state.triggerAccelerationMagnitudeG;

    // check if any subscription matches the device, acceleration and no room change thresholds
    const dueSubscriptions = subscriptions.filter(
      (subscription) =>
        (subscription.deviceCertFingerprintSha256 === null ||
          subscription.deviceCertFingerprintSha256 ===
            state.deviceCertFingerprintSha256) &&
        triggerAccelerationMagnitudeG >=
          subscription.thresholdConfig.minImpactG &&
        new Date(candidateStartedAt.getTime() + subscription.thresholdConfig.noRoomChangeDelaySeconds * 1000) <= now,
    );

    // dismiss if no subscription matches
    if (dueSubscriptions.length === 0) {
      continue;
    }

    const pendingSubscriptions: UserEventSubscriptionWithFallDetection[] = [];

    // dimiss if a subscription has already created a notification for the current state
    for (const subscription of dueSubscriptions) {
      if (
        await hasSubscriptionTriggeredNotificationSinceTime(
          subscription.id,
          candidateStartedAt,
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
      buildFallDetectionNotificationContent(state, patientLabel, now),
      state.triggerAccelerationEventId,
    );
  }
}

function isFallDetectionSubscription(
  subscription: ExistingUserEventSubscription,
): boolean {
  if (!subscription.thresholdConfig || !subscription.thresholdConfig.category) {
    return false;
  }

  return subscription.thresholdConfig.category === "fallDetection";
}

function buildFallDetectionNotificationContent(
  state: FallDetectionStateWithLabels,
  patientLabel: string,
  now: Date,
): { title: string; message: string } {
  const deviceLabel = formatDeviceReference(
    state.deviceName,
    state.deviceCertFingerprintSha256,
  );
  const roomLabel =
    state.triggerBeaconDisplayName?.trim() || state.triggerBeaconMacIdentifier;
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now.getTime() - state.candidateStartedAt!.getTime()) / 1000),
  );
  const locationPhrase = roomLabel ? ` in ${roomLabel}` : "";

  return {
    title: "Possible fall detected",
    message:
      `${patientLabel} (using ${deviceLabel}) may have fallen${locationPhrase}. ` +
      `An acceleration of ${state.triggerAccelerationMagnitudeG} g was recorded at ` +
      `${formatSwissTimestamp(state.candidateStartedAt!)} ` +
      `and there has been no room change for ${formatDurationFromSeconds(elapsedSeconds)}.`,
  };
}

async function getFallDetectionStates(): Promise<
  FallDetectionStateWithLabels[]
> {
  return await db
    .select({
      ...getTableColumns(fallDetectionStates),
      deviceName: devices.name,
      triggerBeaconDisplayName: locationBeacons.displayName,
    })
    .from(fallDetectionStates)
    .leftJoin(
      devices,
      eq(
        fallDetectionStates.deviceCertFingerprintSha256,
        devices.certFingerprintSha256,
      ),
    )
    .leftJoin(
      locationBeacons,
      eq(
        fallDetectionStates.triggerBeaconMacIdentifier,
        locationBeacons.macIdentifier,
      ),
    );
}
