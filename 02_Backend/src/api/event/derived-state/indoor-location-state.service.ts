import { eq } from "drizzle-orm";
import { db } from "../../../db/db";
import { indoorLocationStates } from "../../../db/schema";
import { EventDto } from "../zod/event.schema";
import { getStrongestKnownBeacon } from "../../misc/misc.service";

/**
 * Updates the indoor location state table with the content of an indoor location event.
 * Aborts if event is not from a device or not of type indoor location.
 * Only known beacons are used to update the current room state.
 * @param eventId event id
 * @param event Source event for state update
 */
export async function updateIndoorLocationState(
  eventId: number,
  event: EventDto,
): Promise<void> {
  if (event.type !== "indoorLocation" || event.source.kind !== "device") {
    return;
  }

  const { deviceFingerprint } = event.source;
  const strongestKnownBeaconMac = await getStrongestKnownBeacon(
    event.data.beacons,
  );
  if (!strongestKnownBeaconMac) {
    console.warn(
      `Ignoring indoor location event for state update, no known beacon match for event ${eventId}.`,
    );
    return;
  }

  await db.transaction(async (tx) => {
    const [existingState] = await tx
      .select()
      .from(indoorLocationStates)
      .where(
        eq(indoorLocationStates.deviceCertFingerprintSha256, deviceFingerprint),
      )
      .limit(1);

    if (!existingState) {
      await tx.insert(indoorLocationStates).values({
        deviceCertFingerprintSha256: deviceFingerprint,
        currentBeaconMacIdentifier: strongestKnownBeaconMac,
        previousBeaconMacIdentifier: null,
        beaconSince: event.time,
        previousObservedAt: null,
        lastObservedAt: event.time,
        lastEventId: eventId,
      });

      return;
    }

    if (existingState.currentBeaconMacIdentifier === strongestKnownBeaconMac) {
      await tx
        .update(indoorLocationStates)
        .set({
          lastObservedAt: event.time,
          lastEventId: eventId,
        })
        .where(
          eq(
            indoorLocationStates.deviceCertFingerprintSha256,
            deviceFingerprint,
          ),
        );

      return;
    }

    await tx
      .update(indoorLocationStates)
      .set({
        currentBeaconMacIdentifier: strongestKnownBeaconMac,
        previousBeaconMacIdentifier: existingState.currentBeaconMacIdentifier,
        beaconSince: event.time,
        previousObservedAt: existingState.lastObservedAt,
        lastObservedAt: event.time,
        lastEventId: eventId,
      })
      .where(
        eq(indoorLocationStates.deviceCertFingerprintSha256, deviceFingerprint),
      );
  });
}
