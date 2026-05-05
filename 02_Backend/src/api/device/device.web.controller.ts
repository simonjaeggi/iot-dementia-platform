import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  deleteDevice,
  getDevice,
  getDevices,
  renameDevice,
  setDeviceType,
} from "./device.web.service";
import { FingerprintSchema } from "./zod/cert-fingerprint.schema";
import { RenameDeviceSchema } from "./zod/device-rename.schema";
import { SetDeviceTypeSchema } from "./zod/device-type.schema";

/**
 * Returns devices.
 * @param c HTTP context
 * @returns HTTP JSON response containing a list of devices.
 */
export async function devices(c: Context) {
  const devices = await getDevices();

  return c.json({ devices });
}

/**
 * Returns a single device.
 * @param c HTTP context containing device fingerprint param
 * @returns HTTP JSON response containing the device.
 * @throws {HTTPException} 400 fingerprint invalid
 * @throws {HTTPException} 404 device not found
 */
export async function device(c: Context) {
  const fingerprintResult = FingerprintSchema.safeParse(c.req.param("fingerprint"));

  if (!fingerprintResult.success) {
    throw new HTTPException(400, { message: "Invalid device fingerprint." });
  }

  const existingDevice = await getDevice(fingerprintResult.data);

  if (!existingDevice) {
    throw new HTTPException(404, { message: "Device not found." });
  }

  return c.json(existingDevice);
}

/**
 * Renames the specified device.
 * @param c HTTP context containing {fingerprint, name}
 * @returns HTTP JSON response containing the renamed device.
 * @throws {HTTPException} 400 payload invalid
 * @throws {HTTPException} 404 device not found
 */
export async function rename(c: Context) {
  const body = await c.req.json().catch(() => null);

  const dtoResult = RenameDeviceSchema.safeParse(body);
  if (!dtoResult.success) {
    throw new HTTPException(400, {
      message: dtoResult.error.issues[0]?.message ?? "Invalid payload.",
    });
  }

  const dto = dtoResult.data;

  const renamedDevice = await renameDevice(dto.fingerprint, dto);

  if (!renamedDevice) {
    throw new HTTPException(404, { message: "Device not found." });
  }

  return c.json(renamedDevice);
}

/**
 * Removes the specified device.
 * @param c HTTP context containing body {fingerprint}
 * @returns HTTP JSON response containing the deleted device.
 * @throws {HTTPException} 400 payload invalid
 * @throws {HTTPException} 404 device not found
 */
export async function remove(c: Context) {
  const body = await c.req.json().catch(() => null);
  const fingerprintParse = FingerprintSchema.safeParse(body.fingerprint);

  if (!fingerprintParse.success) {
    throw new HTTPException(400, {
      message: "Invalid device fingerprint.",
    });
  }

  const deletedDevice = await deleteDevice(fingerprintParse.data);

  if (!deletedDevice) {
    throw new HTTPException(404, { message: "Device not found." });
  }

  return c.json(deletedDevice);
}

/**
 * Applies a station template to the specified device.
 * @param c HTTP context containing { fingerprint, deviceType }
 * @returns HTTP JSON response containing the updated device.
 * @throws {HTTPException} 400 payload invalid
 * @throws {HTTPException} 404 device not found
 */
export async function setType(c: Context) {
  const body = await c.req.json().catch(() => null);

  const dtoResult = SetDeviceTypeSchema.safeParse(body);
  if (!dtoResult.success) {
    throw new HTTPException(400, {
      message: dtoResult.error.issues[0]?.message ?? "Invalid payload.",
    });
  }

  const dto = dtoResult.data;

  const updatedDevice = await setDeviceType(dto.fingerprint, dto);

  if (!updatedDevice) {
    throw new HTTPException(404, { message: "Device not found." });
  }

  return c.json(updatedDevice);
}
