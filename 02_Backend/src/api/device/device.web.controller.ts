import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { deleteDevice, getDevices, renameDevice } from "./device.web.service";
import { FingerprintSchema } from "./zod/cert-fingerprint.schema";
import { RenameDeviceSchema } from "./zod/device-rename.schema";

export async function devices(c: Context) {
  const devices = await getDevices();

  return c.json({ devices });
}

export async function rename(c: Context) {
  //await renameDevice()

  throw new HTTPException(501, { message: "Not implemented yet." });
}

export async function remove(c: Context) {
  const payload = c.get("jwtPayload") as { role?: string };
  if (payload?.role !== "admin") {
    throw new HTTPException(403, { message: "Admin role required." });
  }

  const fingerprintResult = FingerprintSchema.safeParse(
    c.req.param("fingerprint"),
  );
  if (!fingerprintResult.success) {
    throw new HTTPException(400, {
      message:
        fingerprintResult.error.issues[0]?.message ?? "Invalid fingerprint.",
    });
  }

  const fingerprint = fingerprintResult.data;
  const deletedDevice = await deleteDevice(fingerprint);

  if (!deletedDevice) {
    throw new HTTPException(404, { message: "Device not found." });
  }

  return c.json(deletedDevice);
}
