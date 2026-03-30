import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  createLocationBeacon as createStoredLocationBeacon,
  createPatient as createStoredPatient,
  deleteLocationBeacon,
  getPatient,
  getLocationBeacons,
  updatePatient as updateStoredPatient,
  isDuplicateMacIdentifierError,
  PatientAlreadyExistsError,
} from "./misc.service";
import { CreatePatientSchema } from "./zod/create-patient.schema";
import { CreateLocationBeaconSchema } from "./zod/create-location-beacon.schema";
import { LocationBeaconIdSchema } from "./zod/location-beacon-id.schema";
import { UpdatePatientSchema } from "./zod/update-patient.schema";

/**
 * Returns location beacons.
 * @param c HTTP context
 * @returns HTTP JSON response containing a list of beacons.
 */
export async function locationBeacons(c: Context) {
  const beacons = await getLocationBeacons();
  return c.json({ beacons });
}

/**
 * Creates a location beacon.
 * @param c HTTP context containing beacon payload
 * @returns HTTP JSON response containing the created beacon.
 * @throws {HTTPException} 400 payload invalid
 * @throws {HTTPException} 500 failed to create beacon
 */
export async function createLocationBeacon(c: Context) {
  const body = await c.req.json().catch(() => null);
  const dtoResult = CreateLocationBeaconSchema.safeParse(body);

  if (!dtoResult.success) {
    throw new HTTPException(400, {
      message: dtoResult.error.issues[0]?.message ?? "Invalid payload.",
    });
  }

  try {
    const beacon = await createStoredLocationBeacon(dtoResult.data);

    if (!beacon) {
      throw new HTTPException(500, {
        message: "Failed to create location beacon.",
      });
    }

    return c.json({ beacon });
  } catch (err) {
    if (isDuplicateMacIdentifierError(err)) {
      throw new HTTPException(409, {
        message: "MAC identifier already in use.",
      });
    }

    throw err;
  }
}

/**
 * Removes the specified beacon.
 * @param c HTTP context containing beacon id
 * @returns HTTP JSON response containing the deleted device.
 * @throws {HTTPException} 400 payload invalid
 * @throws {HTTPException} 404 beacon not found
 */
export async function removeLocationBeacon(c: Context) {
  const idResult = LocationBeaconIdSchema.safeParse(c.req.param("id"));

  if (!idResult.success) {
    throw new HTTPException(400, { message: "Invalid location beacon id." });
  }

  const deletedBeacon = await deleteLocationBeacon(idResult.data);

  if (!deletedBeacon) {
    throw new HTTPException(404, { message: "Location beacon not found." });
  }

  return c.json(deletedBeacon);
}

/**
 * Creates the patient entry.
 * @param c HTTP context containing patient payload
 * @returns HTTP JSON response containing the created patient.
 * @throws {HTTPException} 400 payload invalid
 * @throws {HTTPException} 409 patient already exists
 * @throws {HTTPException} 500 failed to create patient
 */
export async function createPatient(c: Context) {
  const body = await c.req.json().catch(() => null);
  const dtoResult = CreatePatientSchema.safeParse(body);

  if (!dtoResult.success) {
    throw new HTTPException(400, {
      message: dtoResult.error.issues[0]?.message ?? "Invalid payload.",
    });
  }

  try {
    const patient = await createStoredPatient(dtoResult.data);

    if (!patient) {
      throw new HTTPException(500, { message: "Failed to create patient." });
    }

    return c.json({ patient });
  } catch (err) {
    if (err instanceof PatientAlreadyExistsError) {
      throw new HTTPException(409, {
        message: "Only one patient is allowed.",
      });
    }

    throw err;
  }
}

/**
 * Returns the patient entry.
 * @param c HTTP context
 * @returns HTTP JSON response containing the patient or null.
 */
export async function patient(c: Context) {
  const patient = await getPatient();
  return c.json({ patient });
}

/**
 * Updates the singleton patient entry.
 * @param c HTTP context containing patient payload
 * @returns HTTP JSON response containing the updated patient.
 * @throws {HTTPException} 400 payload invalid
 * @throws {HTTPException} 404 patient not found
 */
export async function updatePatient(c: Context) {
  const body = await c.req.json().catch(() => null);
  const dtoResult = UpdatePatientSchema.safeParse(body);

  if (!dtoResult.success) {
    throw new HTTPException(400, {
      message: dtoResult.error.issues[0]?.message ?? "Invalid payload.",
    });
  }

  const patient = await updateStoredPatient(dtoResult.data);

  if (!patient) {
    throw new HTTPException(404, { message: "Patient not found." });
  }

  return c.json({ patient });
}
