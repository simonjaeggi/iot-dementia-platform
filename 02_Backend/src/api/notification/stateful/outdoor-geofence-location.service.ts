import { eq, getTableColumns } from "drizzle-orm";
import haversine from "haversine-distance";
import { db } from "../../../db/db";
import { devices, outdoorLocationStates } from "../../../db/schema";
import {
  createNotificationsForUsers,
  getSubscriptionsByType,
  groupSubscriptionsByUser,
} from "../notification.service";
import {
  ExistingOutdoorLocationState,
  ExistingUserEventSubscription,
} from "../../../db/types";
import { hasSubscriptionTriggeredNotificationSinceTime } from "../stateless/stateless-notification.service";
import {
  formatDeviceReference,
  formatPatientLabel,
  formatSwissTimestamp,
} from "../../../shared/utils";
import { StateGeofenceThresholdConfig } from "../zod/threshold.schema";
import { getPatient } from "../../misc/misc.service";

type OutdoorLocationStateWithDeviceName = ExistingOutdoorLocationState & {
  deviceName: string | null;
};

type UserEventSubscriptionWithGeofence = ExistingUserEventSubscription & {
  thresholdConfig: StateGeofenceThresholdConfig;
};

/**
 * Checks outdoor location states against matching subscriptions.
 * If a subscription matches a state and has not already caused a notification
 * for the latest location update, creates a new notification.
 * @param now current date to check threshold reached, defaults to new Date()
 */
export async function processOutdoorLocationNotifications(
  now: Date = new Date(),
): Promise<void> {
  void now;

  const states = await getOutdoorLocationStates();
  if (states.length === 0) return;
  const patient = await getPatient();
  const patientLabel = formatPatientLabel(patient?.surname);

  const subscriptionRows = await getSubscriptionsByType(
    "outdoorGeofenceCrossed",
  );
  const subscriptions = subscriptionRows.filter(
    isGeofenceSubscription,
  ) as UserEventSubscriptionWithGeofence[];

  // go through states, dismiss if state is not defined
  for (const state of states) {
    if (
      state.previousLat === null ||
      state.previousLng === null ||
      state.previousObservedAt === null
    ) {
      continue;
    }

    const previousLat = state.previousLat;
    const previousLng = state.previousLng;

    // check if any subscriptions matches the device scope and the patient crossed the configured radius
    const dueSubscriptions = subscriptions.filter((subscription) => {
      if (
        subscription.deviceCertFingerprintSha256 !== null &&
        subscription.deviceCertFingerprintSha256 !==
          state.deviceCertFingerprintSha256
      ) {
        return false;
      }

      const wasInside = isInsideGeofence(
        previousLat,
        previousLng,
        subscription.thresholdConfig,
      );
      const isInside = isInsideGeofence(
        state.latestLat,
        state.latestLng,
        subscription.thresholdConfig,
      );

      return wasInside !== isInside;
    });

    // dismiss if subscription has already alerted since the last state change
    for (const subscription of dueSubscriptions) {
      if (
        await hasSubscriptionTriggeredNotificationSinceTime(
          subscription.id,
          state.lastObservedAt,
        )
      ) {
        continue;
      }

      const wasInside = isInsideGeofence(
        previousLat,
        previousLng,
        subscription.thresholdConfig,
      );
      const direction = wasInside ? "left" : "entered";

      await createNotificationsForUsers(
        groupSubscriptionsByUser([subscription]),
        buildOutdoorGeofenceNotificationContent(
          state,
          patientLabel,
          subscription,
          direction,
        ),
        state.lastEventId,
      );
    }
  }
}

function isGeofenceSubscription(
  subscription: ExistingUserEventSubscription,
): boolean {
  if (!subscription.thresholdConfig || !subscription.thresholdConfig.category) {
    return false;
  }

  return subscription.thresholdConfig.category === "stateGeoRadius";
}

function buildOutdoorGeofenceNotificationContent(
  state: OutdoorLocationStateWithDeviceName,
  patientLabel: string,
  subscription: UserEventSubscriptionWithGeofence,
  direction: "entered" | "left",
): { title: string; message: string } {
  const deviceLabel = formatDeviceReference(
    state.deviceName,
    state.deviceCertFingerprintSha256,
  );
  const houseAction =
    direction === "entered" ? "entered the house" : "left the house";

  return {
    title: direction === "entered" ? "Entered the house" : "Left the house",
    message:
      `${patientLabel} (using ${deviceLabel}) ${houseAction} at ` +
      `${formatSwissTimestamp(state.lastObservedAt)}.\n\n` +
      `Current location: ${state.latestLat}, ${state.latestLng}\n` +
      `Geofence center: ${subscription.thresholdConfig.lat}, ${subscription.thresholdConfig.lng}\n` +
      `Radius: ${subscription.thresholdConfig.radiusMeters} m`,
  };
}

function isInsideGeofence(
  lat: number,
  lng: number,
  geofence: StateGeofenceThresholdConfig,
): boolean {
  return (
    haversine({ lat, lon: lng }, { lat: geofence.lat, lon: geofence.lng }) <=
    geofence.radiusMeters
  );
}

async function getOutdoorLocationStates(): Promise<
  OutdoorLocationStateWithDeviceName[]
> {
  return await db
    .select({
      ...getTableColumns(outdoorLocationStates),
      deviceName: devices.name,
    })
    .from(outdoorLocationStates)
    .leftJoin(
      devices,
      eq(
        outdoorLocationStates.deviceCertFingerprintSha256,
        devices.certFingerprintSha256,
      ),
    );
}
