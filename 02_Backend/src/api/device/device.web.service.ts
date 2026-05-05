import { asc, eq } from "drizzle-orm";
import { db } from "../../db/db";
import { devices, locationBeacons } from "../../db/schema";
import { ExistingDevice } from "../../db/types";
import { FingerprintDto } from "./zod/cert-fingerprint.schema";
import { RenameDeviceDto } from "./zod/device-rename.schema";
import { DeviceTypeDto, SetDeviceTypeDto } from "./zod/device-type.schema";
import {
  environmentStationConfigTemplate,
  infrastructureStationConfigTemplate,
  personStationConfigTemplate,
} from "./device-config.templates";
import { DeviceConfigDto } from "./zod/device-config.schema";

type ReturnDevice = ExistingDevice & {
  downSeconds: number | null;
};

/**
 * Get device from db, compute downSeconds and return device.
 *
 * @returns {Promise<ReturnDevice | null>} Device if found, otherwise null.
 */
export async function getDevice(
  fingerprint: FingerprintDto,
): Promise<ReturnDevice | null> {
  const row = await db
    .select()
    .from(devices)
    .where(eq(devices.certFingerprintSha256, fingerprint))
    .limit(1);
  const device = row[0];

  if (!device) {
    return null;
  }

  return { ...device, downSeconds: getDownSeconds(device.lastSeen) };
}

/**
 * Get devices from db, compute downSeconds and return device list.
 *
 * @returns {Promise<ReturnDevice[]>} Device list
 */
export async function getDevices(): Promise<ReturnDevice[]> {
  const rows = await db.select().from(devices);
  const now = Date.now();

  return rows.map((device) => {
    return { ...device, downSeconds: getDownSeconds(device.lastSeen) };
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
 * Sets a device config from a station template and resolves beacon MACs for indoor location sensors.
 * @param fingerprint Device cert fingerprint to match devices table
 * @param input Station template payload
 * @returns {Promise<ExistingDevice | null>} Updated device if found, null otherwise.
 */
export async function setDeviceType(
  fingerprint: FingerprintDto,
  input: SetDeviceTypeDto,
): Promise<ExistingDevice | null> {
  return db.transaction(async (tx) => {
    const [existingDevice] = await tx
      .select({ config: devices.config })
      .from(devices)
      .where(eq(devices.certFingerprintSha256, fingerprint))
      .limit(1);

    if (!existingDevice) {
      return null;
    }

    const config = await buildDeviceConfigForType(input.deviceType);
    config.version = existingDevice.config.version + 1;

    const rows = await tx
      .update(devices)
      .set({ config })
      .where(eq(devices.certFingerprintSha256, fingerprint))
      .returning();

    return rows[0] ?? null;
  });
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

/**
 * Helper function that returns the seconds since a device was last seen.
 * @param lastSeen Date object when device was last seen
 * @returns Seconds since lastSeen, null if never seen.
 */
function getDownSeconds(lastSeen: Date | null): number | null {
  const lastSeenMs = lastSeen ? lastSeen.getTime() : null;
  const now = Date.now();

  const downSeconds =
    lastSeenMs === null || Number.isNaN(lastSeenMs)
      ? null
      : Math.max(0, Math.floor((now - lastSeenMs) / 1000));
  return downSeconds;
}

async function buildDeviceConfigForType(
  deviceType: DeviceTypeDto,
): Promise<DeviceConfigDto> {
  let config: DeviceConfigDto;

  switch (deviceType) {
    case "environmentStation":
      config = structuredClone(environmentStationConfigTemplate);
      break;
    case "infrastructureStation":
      config = structuredClone(infrastructureStationConfigTemplate);
      break;
    case "personStation":
      config = structuredClone(personStationConfigTemplate);
      break;
  }

  if (!config.sensors.some((sensor) => sensor.type === "indoorLocation")) {
    return config;
  }

  const beacons = await db
    .select({ macIdentifier: locationBeacons.macIdentifier })
    .from(locationBeacons)
    .orderBy(asc(locationBeacons.displayName), asc(locationBeacons.id));

  const beaconMacAddresses = beacons.map((beacon) => beacon.macIdentifier);

  return {
    ...config,
    sensors: config.sensors.map((sensor) => {
      if (sensor.type !== "indoorLocation") {
        return sensor;
      }

      return {
        ...sensor,
        beaconMacAddresses,
      };
    }),
  };
}
