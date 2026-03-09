import { Context } from "hono";
import { DeviceReportSchema } from "./zod/device-report.schema";
import {
  ensureDeviceExistsAndUpdateLastSeen,
  isDesiredVersion,
  isDeviceAuthorised,
  getDeviceConfig,
} from "./device.mtls.service";
import { HTTPException } from "hono/http-exception";
import {
  FingerprintDto,
  FingerprintSchema,
} from "./zod/cert-fingerprint.schema";
import { EventSchema } from "../event/zod/event.schema";
import { createEvent } from "../event/event.service";
import z from "zod";

// todo, this is fine as long as the object is parsed again later, but could lead to bugs if the backend does
// not cleanly overwrite the sensor object.
const BodySchema = z.object({ data: z.looseObject({}) });

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
  const dtoResult = DeviceReportSchema.safeParse(body);
  if (!dtoResult.success) {
    throw new HTTPException(400, {
      message: dtoResult.error.issues[0]?.message ?? "Invalid payload.",
    });
  }
  const dto = dtoResult.data;

  await ensureDeviceExistsAndUpdateLastSeen(fingerprint);

  const upToDate = await isDesiredVersion(fingerprint, dto.version);

  return c.json({
    ok: true,
    configChanged: !upToDate,
  });
}

// todo document
export async function createDeviceEvent(c: Context) {
  const fingerprint = await requireAuthorisedDeviceFingerprint(c);

  const body = await c.req.json().catch(() => null);
  const bodyResult = BodySchema.safeParse(body);
  if (!bodyResult.success) {
    throw new HTTPException(400, {
      message: bodyResult.error.issues[0]?.message ?? "Invalid payload.",
    });
  }

  const eventPayload = {
    ...body.data,
    time: new Date(),
    source: {
      ...body.data.source,
      kind: "device",
      deviceFingerprint: fingerprint,
    },
  };
  console.log(eventPayload);
  const dtoResult = EventSchema.safeParse(eventPayload);
  if (!dtoResult.success) {
    throw new HTTPException(400, {
      message: dtoResult.error.issues[0]?.message ?? "Invalid payload.",
    });
  }

  const created = await createEvent(dtoResult.data);
  if (!created) {
    throw new HTTPException(500, { message: "Failed to create event." });
  }

  return c.json(created);
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

// todo consider putting this in auth middleware.
/**
 * Checks HTTP context for device fingerprint in header.
 *
 * @param c HTTP context
 * @returns {Promise<Fingerprint>} Fingerprint extracted from header
 *
 * @throws {HTTPException} 400 if header is missing or invalid
 * @throws {HTTPException} 401 if device is not authorised
 */
export async function requireAuthorisedDeviceFingerprint(
  c: Context,
): Promise<FingerprintDto> {
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
