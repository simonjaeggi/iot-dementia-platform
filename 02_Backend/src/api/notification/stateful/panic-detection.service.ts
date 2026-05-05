import {
  createNotificationsForUsers,
  getSubscriptionsByType,
  groupSubscriptionsByUser,
} from "../notification.service";
import {
  formatDurationFromSeconds,
  formatPatientLabel,
  formatSwissTimestamp,
} from "../../../shared/utils";
import { ExistingUserEventSubscription, ExistingEvent } from "../../../db/types";
import { PanicNoiseLevelDurationThresholdConfig } from "../zod/threshold.schema";
import { hasSubscriptionTriggeredNotificationSinceTime } from "../stateless/stateless-notification.service";
import { getPatient } from "../../misc/misc.service";
import { getEventsByTypeAndLastXSeconds } from "../../event/event.service";
import { NoiseLevelEvent } from "../../event/zod/event.schema";

type PanicSubscription =
  ExistingUserEventSubscription & {
    thresholdConfig: PanicNoiseLevelDurationThresholdConfig;
  };

type StoredNoiseLevelEvent = ExistingEvent & {
  data: NoiseLevelEvent;
};

type StoredDeviceNoiseLevelEvent = StoredNoiseLevelEvent & {
  data: NoiseLevelEvent & {
    source: Extract<NoiseLevelEvent["source"], { kind: "device" }>;
  };
};

/**
 * Checks each user subscriptions for panic detection against the threshold.
 * Notification is dismissed, if there are no relevant events, if the noise level 
 * drops below the threshold during the time window, or if the subscription has 
 * already created a notification during the time window.
 * @param now current date to check threshold reached, defaults to new Date()
 */
export async function processPanicNotifications(
  now: Date = new Date(),
): Promise<void> {
  const subscriptionRows = await getSubscriptionsByType("panicDetection");
  const subscriptions = subscriptionRows.filter(
    isPanicNoiseLevelDurationSubscription,
  ) as PanicSubscription[];

  if (subscriptions.length === 0) {
    return;
  }

  // get the amount of events needed to cover the largest subscription threshold
  const maxDurationSeconds = Math.max(
    ...subscriptions.map(
      (subscription) => subscription.thresholdConfig.durationSeconds,
    ),
  );
  const recentNoiseEvents = (await getEventsByTypeAndLastXSeconds(
    "noiseLevel",
    maxDurationSeconds,
  )).filter(isDeviceNoiseLevelEvent);

  if (recentNoiseEvents.length === 0) {
    return;
  }

  const patientLabel = formatPatientLabel((await getPatient())?.surname);

  // check each subscription against the configured threshold
  for (const subscription of subscriptions) {
    const windowStart = new Date(
      now.getTime() - subscription.thresholdConfig.durationSeconds * 1000,
    );

    const relevantEvents = recentNoiseEvents
      .filter((event) => {
        if (event.time < windowStart) {
          return false;
        }

        if (subscription.deviceCertFingerprintSha256 === null) {
          return true;
        }

        return (
          event.data.source.deviceFingerprint ===
          subscription.deviceCertFingerprintSha256
        );
      })
      .sort((a, b) => a.time.getTime() - b.time.getTime());


    // dismiss if no events are in the configured time of the subscription
    if (relevantEvents.length === 0) {
      continue;
    }

    // dismiss if not all events in the timeframe of the subscription are above the threshold
    const allAboveThreshold = relevantEvents.every(
      (event) =>
        event.data.data.approx_db >= subscription.thresholdConfig.minDb,
    );

    if (!allAboveThreshold) {
      continue;
    }

    const continuousNoiseSince = relevantEvents[0].time;
    const latestEvent = relevantEvents[relevantEvents.length - 1];

    // dismiss if the subscription has already created a notification for the current period
    if (
      await hasSubscriptionTriggeredNotificationSinceTime(
        subscription.id,
        continuousNoiseSince,
      )
    ) {
      continue;
    }

    await createNotificationsForUsers(
      groupSubscriptionsByUser([subscription]),
      buildPanicDetectionNotificationContent(
        latestEvent.data.data.approx_db,
        patientLabel,
        continuousNoiseSince,
        subscription.thresholdConfig.minDb,
        now,
      ),
      latestEvent.id,
    );
  }
}

function isPanicNoiseLevelDurationSubscription(
  subscription: ExistingUserEventSubscription,
): boolean {
  return subscription.thresholdConfig?.category === "noiseLevelDuration";
}

function isDeviceNoiseLevelEvent(
  event: ExistingEvent,
): event is StoredDeviceNoiseLevelEvent {
  return (
    event.type === "noiseLevel" &&
    (event.data as NoiseLevelEvent).source.kind === "device"
  );
}

function buildPanicDetectionNotificationContent(
  latestApproxDb: number,
  patientLabel: string,
  continuousNoiseSince: Date,
  minDb: number,
  now: Date,
): { title: string; message: string } {
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now.getTime() - continuousNoiseSince.getTime()) / 1000),
  );

  return {
    title: "Panic detection",
    message:
      `${patientLabel} has had noise above ${minDb} dB since ` +
      `${formatSwissTimestamp(continuousNoiseSince)} ` +
      `(${formatDurationFromSeconds(elapsedSeconds)}).\n\n` +
      `Current noise level: ${latestApproxDb} dB`,
  };
}
