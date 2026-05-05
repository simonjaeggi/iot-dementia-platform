import { db } from "../../db/db";
import { deviceCertificates, devices } from "../../db/schema";
import { NewDevice } from "../../db/types";
import { FingerprintDto } from "./zod/cert-fingerprint.schema";
import { emptyDeviceConfigTemplate } from "./device-config.templates";
import { and, eq, isNull } from "drizzle-orm";
import { DeviceConfigDto } from "./zod/device-config.schema";

/**
 * Ensures the device exists and updates lastSeen.
 *
 * If the device is new, it is inserted with default config.
 * If it already exists, only lastSeen is updated.
 */
export async function ensureDeviceExistsAndUpdateLastSeen(
  fingerprint: FingerprintDto,
): Promise<void> {
  const now = new Date();

  const device: NewDevice = {
    certFingerprintSha256: fingerprint,
    createdAt: now,
    lastSeen: now,
    config: emptyDeviceConfigTemplate,
  };

  await db.insert(devices).values(device).onConflictDoUpdate({
    target: devices.certFingerprintSha256,
    set: { lastSeen: now },
  });
}

/**
 * Checks if the config version of a given device matches the desired version in the device table.
 * 
 * @param fingerprint Device cert fingerprint to match device in devices table
 * @param version Device version to be checked against db entry 
 * @returns {Promise<boolean>} True if the passed version matches the db version, False otherwise.
 */
export async function isDesiredVersion(
  fingerprint: FingerprintDto,
  version: number,
): Promise<boolean> {
  const rows = await db
    .select({ version: devices.config })
    .from(devices)
    .where(eq(devices.certFingerprintSha256, fingerprint))
    .limit(1);

  if (!rows[0]) {
    return false;
  }

  return rows[0].version.version === version;
}

/**
 * Checks whether a device is authorised to use the platform
 * based on its certificate fingerprint.
 * @param fingerprint Device cert fingerprint to match deviceCertificates table
 * 
 * @returns {Promise<boolean>} True if fingerprint matches a non revoked certificate, False otherwise.
 */
export async function isDeviceAuthorised(
  fingerprint: FingerprintDto,
): Promise<boolean> {
  const rows = await db
    .select({ id: deviceCertificates.id })
    .from(deviceCertificates)
    .where(
      and(
        eq(deviceCertificates.certFingerprintSha256, fingerprint),
        isNull(deviceCertificates.revokedAt),
      ),
    )
    .limit(1);

  return rows.length > 0;
}

/**
 * Returns the device configuration from db.
 * @param fingerprint Device cert fingerprint to match devices table
 * @returns {Promise<DeviceConfig | null>} if found, null otherwise.
 */
export async function getDeviceConfig(
  fingerprint: FingerprintDto,
): Promise<DeviceConfigDto | null> {
  const rows = await db
    .select({ config: devices.config })
    .from(devices)
    .where(eq(devices.certFingerprintSha256, fingerprint))
    .limit(1);

  return rows.length ? rows[0]!.config : null;
}
