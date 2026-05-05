import { eq, inArray } from "drizzle-orm";
import { db } from "../../../db/db";
import {
  fallDetectionStates,
  indoorLocationStates,
  locationBeacons,
} from "../../../db/schema";
import { EventDto } from "../zod/event.schema";
import { getStrongestKnownBeacon } from "../../misc/misc.service";

/**
 * Updates the fall detection state table from acceleration and indoor location events.
 * When an acceleration event occurs, a "fall-candidate" is created. If the room is changed, the fall is dismissed.
 * @param eventId event id
 * @param event source event
 */
export async function updateFallDetectionState(
  eventId: number,
  event: EventDto,
): Promise<void> {
  if (event.source.kind !== "device") {
    return;
  }

  if (event.type !== "acceleration" && event.type !== "indoorLocation") {
    return;
  }

  const { deviceFingerprint } = event.source;

  await db.transaction(async (tx) => {
    const [existingState] = await tx
      .select()
      .from(fallDetectionStates)
      .where(
        eq(fallDetectionStates.deviceCertFingerprintSha256, deviceFingerprint),
      )
      .limit(1);

    if (event.type === "acceleration") {
      const [indoorState] = await tx
        .select({
          currentBeaconMacIdentifier:
            indoorLocationStates.currentBeaconMacIdentifier,
        })
        .from(indoorLocationStates)
        .where(
          eq(
            indoorLocationStates.deviceCertFingerprintSha256,
            deviceFingerprint,
          ),
        )
        .limit(1);

      const currentBeaconMacIdentifier =
        indoorState?.currentBeaconMacIdentifier ?? null;

      const nextValues = {
        candidateStartedAt: event.time,
        triggerAccelerationMagnitudeG: event.data.magnitudeG,
        triggerAccelerationEventId: eventId,
        triggerBeaconMacIdentifier: currentBeaconMacIdentifier,
        lastObservedBeaconMacIdentifier: currentBeaconMacIdentifier,
        lastObservedAt: event.time,
        lastEventId: eventId,
      };

      if (!existingState) {
        await tx.insert(fallDetectionStates).values({
          deviceCertFingerprintSha256: deviceFingerprint,
          ...nextValues,
        });
        return;
      }

      await tx
        .update(fallDetectionStates)
        .set(nextValues)
        .where(
          eq(
            fallDetectionStates.deviceCertFingerprintSha256,
            deviceFingerprint,
          ),
        );

      return;
    }

    if (!existingState) {
      return;
    }

    const strongestKnownBeaconMac = await getStrongestKnownBeacon(event.data.beacons);

    // if we see a change of rooms, we can clear the fall candidate
    if (
      existingState.candidateStartedAt !== null &&
      existingState.triggerBeaconMacIdentifier !== strongestKnownBeaconMac
    ) {
      await tx
        .update(fallDetectionStates)
        .set({
          candidateStartedAt: null,
          triggerAccelerationMagnitudeG: null,
          triggerAccelerationEventId: null,
          triggerBeaconMacIdentifier: null,
          lastObservedBeaconMacIdentifier: strongestKnownBeaconMac,
          lastObservedAt: event.time,
          lastEventId: eventId,
        })
        .where(
          eq(
            fallDetectionStates.deviceCertFingerprintSha256,
            deviceFingerprint,
          ),
        );

      return;
    }

    // if the room doesnt change, just update the timestamp
    await tx
      .update(fallDetectionStates)
      .set({
        lastObservedBeaconMacIdentifier: strongestKnownBeaconMac,
        lastObservedAt: event.time,
        lastEventId: eventId,
      })
      .where(
        eq(fallDetectionStates.deviceCertFingerprintSha256, deviceFingerprint),
      );
  });
}
