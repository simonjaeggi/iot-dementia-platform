import { eq } from "drizzle-orm";
import { db } from "../../db/db";
import { devices } from "../../db/schema";
import { ExistingDevice } from "../../db/types";
import { Fingerprint } from "./zod/cert-fingerprint.schema";
import { RenameDeviceDto } from "./zod/device-rename.schema";

export async function getDevices(): Promise<ExistingDevice[]> {
  const rows = await db.select().from(devices);

  return rows;
}

export async function renameDevice(
  fingerprint: Fingerprint,
  input: RenameDeviceDto,
): Promise<ExistingDevice> {
 throw new Error("not implemented yet.")
}

export async function deleteDevice(
  fingerprint: Fingerprint,
): Promise<ExistingDevice | null> {
  const rows = await db
    .delete(devices)
    .where(eq(devices.certFingerprintSha256, fingerprint))
    .returning();

  return rows[0] ?? null;
}
