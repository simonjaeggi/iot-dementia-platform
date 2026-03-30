import { Context } from "hono";
import { DeviceReportSchema } from "./zod/device-report.schema";
import {
  ensureDeviceExistsAndUpdateLastSeen,
  isDesiredVersion,
  getDeviceConfig,
} from "./device.mtls.service";
import { HTTPException } from "hono/http-exception";
import { EventSchema } from "../event/zod/event.schema";
import { createEvent } from "../event/event.service";
import z from "zod";
import { getAuthorisedDeviceFingerprint } from "../auth/auth.middleware";

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
  const fingerprint = getAuthorisedDeviceFingerprint(c);

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

/**
 * Creates a new event based on sensor data. Attaches time and source details and stores the event in db.
 * @param c HTTP context
 * @returns Stored event from db
 * @throws {HTTPException} 400 Payload invalid
 * @throws {HTTPException} 500 Failed to store event to db
 */
export async function createDeviceEvent(c: Context) {
  const fingerprint = getAuthorisedDeviceFingerprint(c);

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
  const clientFingerprint = getAuthorisedDeviceFingerprint(c);
  const config = await getDeviceConfig(clientFingerprint);
  if (!config) {
    throw new HTTPException(404, { message: "No config found for device." });
  }
  return c.json(config);
}
