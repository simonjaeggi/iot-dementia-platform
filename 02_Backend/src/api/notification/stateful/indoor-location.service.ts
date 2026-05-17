import { eq, getTableColumns } from "drizzle-orm";
import { db } from "../../../db/db";
import { devices, indoorLocationStates, locationBeacons } from "../../../db/schema";
import {
  claimNotificationMarker,
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
import { IndoorBeaconDurationThresholdConfig } from "../zod/threshold.schema";
import {
  ExistingUserEventSubscription,
  ExistingIndoorLocationState,
} from "../../../db/types";
import { getPatient } from "../../misc/misc.service";

type IndoorLocationStateWithLabels = ExistingIndoorLocationState & {
  currentBeaconDisplayName: string | null;
  deviceName: string | null;
};

type UserEventSubscriptionWithIndoorBeaconDuration =
  ExistingUserEventSubscription & {
    thresholdConfig: IndoorBeaconDurationThresholdConfig;
  };

/**
 * Checks indoor location states against matching subscriptions.
 * If a subscription matches a state and has not already caused a notification
 * since the current state began, creates a new notification.
 * @param now current date to check threshold reached, defaults to new Date()
 */
export async function processIndoorLocationNotifications(
  now: Date = new Date(),
): Promise<void> {
  const states = await getIndoorLocationStates();
  if (states.length === 0) return;

  const subscriptionRows = await getSubscriptionsByType("sameRoomTooLong");
  const subscriptions = subscriptionRows.filter(
    isIndoorBeaconDurationSubscription,
  ) as UserEventSubscriptionWithIndoorBeaconDuration[];
  if (subscriptions.length === 0) return;

  const patientLabel = formatPatientLabel((await getPatient())?.surname);

  // check each state, if a state is not set, dismiss
  for (const state of states) {
    if (state.currentBeaconMacIdentifier === null || state.beaconSince === null) {
      continue;
    }

    const beaconSince = state.beaconSince;

    // check if any subscription matches device scope and time window
    const dueSubscriptions = subscriptions.filter(
      (subscription) =>
        (subscription.deviceCertFingerprintSha256 === null ||
          subscription.deviceCertFingerprintSha256 ===
            state.deviceCertFingerprintSha256) &&
        isWithinTimeWindow(now, subscription.thresholdConfig) &&
        new Date(
          beaconSince.getTime() +
            subscription.thresholdConfig.durationSeconds * 1000,
        ) <= now,
    );

    if (dueSubscriptions.length === 0) {
      continue;
    }

    const pendingSubscriptions: ExistingUserEventSubscription[] = [];
    const triggerKey = `sameRoomTooLong:dev=${state.deviceCertFingerprintSha256}:beaconSince=${beaconSince.toISOString()}`;
    // dismiss if subscription has already caused a notification since the person is in the same room
    for (const subscription of dueSubscriptions) {
      if (!(await claimNotificationMarker(subscription.id, triggerKey))) {
        continue;
      }

      pendingSubscriptions.push(subscription);
    }

    if (pendingSubscriptions.length === 0) {
      continue;
    }

    await createNotificationsForUsers(
      groupSubscriptionsByUser(pendingSubscriptions),
      buildIndoorLocationNotificationContent(
        state,
        patientLabel,
        beaconSince,
        now,
      ),
      state.lastEventId,
    );
  }
}

function isIndoorBeaconDurationSubscription(
  subscription: ExistingUserEventSubscription,
): boolean {
  return subscription.thresholdConfig?.category === "indoorBeaconDuration";
}

function buildIndoorLocationNotificationContent(
  state: IndoorLocationStateWithLabels,
  patientLabel: string,
  beaconSince: Date,
  now: Date,
): { title: string; message: string } {
  const deviceLabel = formatDeviceReference(
    state.deviceName,
    state.deviceCertFingerprintSha256,
  );
  const roomLabel =
    state.currentBeaconDisplayName?.trim() || state.currentBeaconMacIdentifier;
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now.getTime() - beaconSince.getTime()) / 1000),
  );

  return {
    title: `${patientLabel} has stayed in ${roomLabel} too long`,
    message:
      `${patientLabel} has been in ${roomLabel} since ` +
      `${formatSwissTimestamp(beaconSince)} ` +
      `(${formatDurationFromSeconds(elapsedSeconds)}), based on ${deviceLabel}.`,
  };
}

function isWithinTimeWindow(
  now: Date,
  threshold: IndoorBeaconDurationThresholdConfig,
): boolean {
  const { startTime, endTime } = threshold;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseTimeOfDayToMinutes(startTime);
  const endMinutes = parseTimeOfDayToMinutes(endTime);

  if (startMinutes === endMinutes) {
    return true;
  }

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}

function parseTimeOfDayToMinutes(timeOfDay: string): number {
  const [hours, minutes] = timeOfDay.split(":").map(Number);
  return hours * 60 + minutes;
}

async function getIndoorLocationStates(): Promise<IndoorLocationStateWithLabels[]> {
  return await db
    .select({
      ...getTableColumns(indoorLocationStates),
      currentBeaconDisplayName: locationBeacons.displayName,
      deviceName: devices.name,
    })
    .from(indoorLocationStates)
    .leftJoin(
      locationBeacons,
      eq(
        indoorLocationStates.currentBeaconMacIdentifier,
        locationBeacons.macIdentifier,
      ),
    )
    .leftJoin(
      devices,
      eq(
        indoorLocationStates.deviceCertFingerprintSha256,
        devices.certFingerprintSha256,
      ),
    );
}
