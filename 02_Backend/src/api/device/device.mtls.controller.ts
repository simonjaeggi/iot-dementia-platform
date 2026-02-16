import { Context } from "hono";
import { DeviceReportSchema } from "./zod/device-report.schema";
import {
  ensureDeviceExistsAndUpdateLastSeen,
  isDesiredVersion,
  isDeviceAuthorised,
  getDeviceConfig,
} from "./device.mtls.service";
import { HTTPException } from "hono/http-exception";
import { Fingerprint, FingerprintSchema } from "./zod/cert-fingerprint.schema";

/**
 * Takes a device report.
 * Ensures the device exists, updates lastSeen and checks whether the device
 * config version is up to date.
 *
 * @param c HTTP context
 * @returns JSON containing { ok, configChanged }
 */
export async function report(c: Context) {
  const fingerprint = await requireAuthorisedDeviceFingerprint(c);

  const body = await c.req.json();
  const dto = DeviceReportSchema.parse(body);

  await ensureDeviceExistsAndUpdateLastSeen(fingerprint);

  const upToDate = await isDesiredVersion(fingerprint, dto.version);

  return c.json({
    ok: true,
    configChanged: !upToDate,
  });
}

/**
 * Returns the device config.
 * @param c HTTP context
 * @returns device config for matching fingerprint
 * @throws {HTTPException} 404 if no device config found.
 */
export async function config(c: Context) {
  const clientFingerprint = await requireAuthorisedDeviceFingerprint(c);
  const config = await getDeviceConfig(clientFingerprint);
  if (!config) {
    throw new HTTPException(404, { message: "No config found for device." });
  }
  return c.json(config);
}

/**
 * Checks HTTP context for device fingerprint in header.
 *
 * @param c HTTP context
 * @returns Promise<Fingerprint> Fingerprint extracted from header
 *
 * @throws {HTTPException} 400 if header is missing or invalid
 * @throws {HTTPException} 401 if device is not authorised
 */
export async function requireAuthorisedDeviceFingerprint(
  c: Context,
): Promise<Fingerprint> {
  const headerFingerprint = c.req.header("X-Device-Fingerprint");

  if (!headerFingerprint) {
    throw new HTTPException(400, {
      message: "Missing X-Device-Fingerprint header.",
    });
  }

  const parsed = FingerprintSchema.safeParse(headerFingerprint);

  if (!parsed.success) {
    throw new HTTPException(400, {
      message: parsed.error.issues[0]?.message ?? "Invalid fingerprint.",
    });
  }

  const fingerprint = parsed.data;

  const ok = await isDeviceAuthorised(fingerprint);
  if (!ok) {
    throw new HTTPException(401, {
      message: "Device not authorised.",
    });
  }

  return fingerprint;
}
