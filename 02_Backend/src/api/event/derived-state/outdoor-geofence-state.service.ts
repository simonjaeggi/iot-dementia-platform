import { eq } from "drizzle-orm";
import { db } from "../../../db/db";
import { outdoorLocationStates } from "../../../db/schema";
import { EventDto } from "../zod/event.schema";

/**
 * Updates the outdoor location state table with the content of an outdoor location event.
 * Aborts if event is not from a device or of not of type outdoor location.
 * @param eventId event id
 * @param event Source event for state update
 */
export async function updateOutdoorGeofenceState(
  eventId: number,
  event: EventDto,
): Promise<void> {
  if (event.type !== "outdoorLocation" || event.source.kind !== "device") {
    return;
  }

  const { deviceFingerprint } = event.source;

  await db.transaction(async (tx) => {
    const [existingState] = await tx
      .select()
      .from(outdoorLocationStates)
      .where(
        eq(outdoorLocationStates.deviceCertFingerprintSha256, deviceFingerprint),
      )
      .limit(1);

    if (!existingState) {
      await tx.insert(outdoorLocationStates).values({
        deviceCertFingerprintSha256: deviceFingerprint,
        latestLat: event.data.lat,
        latestLng: event.data.lng,
        latestAltitudeMeters: event.data.altitudeMeters,
        latestSatelliteCount: event.data.satelliteCount,
        previousLat: null,
        previousLng: null,
        previousAltitudeMeters: null,
        previousSatelliteCount: null,
        previousObservedAt: null,
        lastObservedAt: event.time,
        lastEventId: eventId,
      });

      return;
    }

    await tx
      .update(outdoorLocationStates)
      .set({
        previousLat: existingState.latestLat,
        previousLng: existingState.latestLng,
        previousAltitudeMeters: existingState.latestAltitudeMeters,
        previousSatelliteCount: existingState.latestSatelliteCount,
        previousObservedAt: existingState.lastObservedAt,
        latestLat: event.data.lat,
        latestLng: event.data.lng,
        latestAltitudeMeters: event.data.altitudeMeters,
        latestSatelliteCount: event.data.satelliteCount,
        lastObservedAt: event.time,
        lastEventId: eventId,
      })
      .where(
        eq(outdoorLocationStates.deviceCertFingerprintSha256, deviceFingerprint),
      );
  });
}
