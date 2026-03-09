import { eq } from "drizzle-orm";
import { db } from "../../db/db";
import { devices } from "../../db/schema";
import { ExistingDevice } from "../../db/types";
import { FingerprintDto } from "./zod/cert-fingerprint.schema";
import { RenameDeviceDto } from "./zod/device-rename.schema";

type ReturnDevice = ExistingDevice & {
  downSeconds: number | null;
};

/**
 * Get devices from db, compute downSeconds and return device list.
 *
 * @returns {Promise<ReturnDevice[]>} Device list
 */
export async function getDevices(): Promise<ReturnDevice[]> {
  const rows = await db.select().from(devices);
  const now = Date.now();

  return rows.map((row) => {
    const lastSeenMs = row.lastSeen ? row.lastSeen.getTime() : null;

    const downSeconds =
      lastSeenMs === null || Number.isNaN(lastSeenMs)
        ? null
        : Math.max(0, Math.floor((now - lastSeenMs) / 1000));

    return { ...row, downSeconds };
  });
}

/**
 * Renames a device in db and returns updated object.
 * @param fingerprint Device cert fingerprint to match devices table
 * @param input New device name
 * @returns {Promise<ExistingDevice | null>} Device if found and updated, null otherwise.
 */
export async function renameDevice(
  fingerprint: FingerprintDto,
  input: RenameDeviceDto,
): Promise<ExistingDevice | null> {
  const rows = await db
    .update(devices)
    .set({ name: input.name })
    .where(eq(devices.certFingerprintSha256, fingerprint))
    .returning();

  return rows[0] ?? null;
}

/**
 * Deletes a device from db and returns the deleted object.
 * @param fingerprint Device cert fingerprint to match devices table
 * @returns {Promise<ExistingDevice | null>} Device if found and deleted, null otherwise.
 */
export async function deleteDevice(
  fingerprint: FingerprintDto,
): Promise<ExistingDevice | null> {
  const rows = await db
    .delete(devices)
    .where(eq(devices.certFingerprintSha256, fingerprint))
    .returning();

  return rows[0] ?? null;
}
