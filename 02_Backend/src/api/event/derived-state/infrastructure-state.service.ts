import { eq } from "drizzle-orm";
import { db } from "../../../db/db";
import { infrastructureStates } from "../../../db/schema";
import { EventDto } from "../zod/event.schema";

/**
 * Updates the infrastructure state table with the content of an infrastructure event.
 * Aborts if event is not from a device or of not of type infrastructure.
 * @param eventId event id
 * @param event Source event for state update
 */
export async function updateInfrastructureState(
  eventId: number,
  event: EventDto,
): Promise<void> {
  if (event.type !== "infrastructure" || event.source.kind !== "device") {
    return;
  }

  const { deviceFingerprint } = event.source;

  await db.transaction(async (tx) => {
    const [existingState] = await tx
      .select()
      .from(infrastructureStates)
      .where(
        eq(infrastructureStates.deviceCertFingerprintSha256, deviceFingerprint),
      )
      .limit(1);

    if (!existingState) {
      await tx.insert(infrastructureStates).values({
        deviceCertFingerprintSha256: deviceFingerprint,
        status: event.data.status,
        statusSince: event.time,
        lastObservedAt: event.time,
        nextCheckAt: null,
        lastEventId: eventId,
      });

      return;
    }

    await tx
      .update(infrastructureStates)
      .set({
        status: event.data.status,
        statusSince:
          existingState.status === event.data.status
            ? existingState.statusSince
            : event.time,
        lastObservedAt: event.time,
        nextCheckAt: null,
        lastEventId: eventId,
      })
      .where(
        eq(infrastructureStates.deviceCertFingerprintSha256, deviceFingerprint),
      );
  });
}
