import { asc, eq } from "drizzle-orm";
import { DrizzleQueryError } from "drizzle-orm/errors";
import { DatabaseError } from "pg";
import { db } from "../../db/db";
import { ExistingLocationBeacon, ExistingPatient } from "../../db/types";
import { locationBeacons, patients } from "../../db/schema";
import { CreatePatientDto } from "./zod/create-patient.schema";
import { CreateLocationBeaconDto } from "./zod/create-location-beacon.schema";
import { LocationBeaconId } from "./zod/location-beacon-id.schema";
import { UpdatePatientDto } from "./zod/update-patient.schema";

export class PatientAlreadyExistsError extends Error {
  constructor() {
    super("Only one patient is allowed.");
  }
}

/**
 * Returns all location beacons.
 * @returns {Promise<ExistingLocationBeacon[]>} Beacon list
 */
export async function getLocationBeacons(): Promise<ExistingLocationBeacon[]> {
  return db
    .select()
    .from(locationBeacons)
    .orderBy(asc(locationBeacons.displayName), asc(locationBeacons.id));
}

/**
 * Creates a new location beacon.
 * @param input Beacon payload
 * @returns {Promise<ExistingLocationBeacon | null>} Created beacon with id, null otherwise.
 */
export async function createLocationBeacon(
  input: CreateLocationBeaconDto,
): Promise<ExistingLocationBeacon | null> {
  const [beacon] = await db.insert(locationBeacons).values(input).returning();

  return beacon ?? null;
}

/**
 * Evaluates if a drizzle error is a mac duplication error.
 * @param error drizzle error to check
 * @returns True if error is duplicate mac, false otherwise.
 */
export function isDuplicateMacIdentifierError(error: unknown): boolean {
  return (
    error instanceof DrizzleQueryError &&
    error.cause instanceof DatabaseError &&
    error.cause.code === "23505" &&
    error.cause.constraint === "location_beacons_mac_identifier_unique"
  );
}

/**
 * Deletes a location beacon from db and returns the deleted object.
 * @param id Beacon id
 * @returns {Promise<ExistingLocationBeacon | null>} Location beacon if found and deleted, null otherwise.
 */
export async function deleteLocationBeacon(
  id: LocationBeaconId,
): Promise<ExistingLocationBeacon | null> {
  const deleted = await db
    .delete(locationBeacons)
    .where(eq(locationBeacons.id, id))
    .returning();

  return deleted[0] ?? null;
}

/**
 * Returns the patient entry.
 * @returns {Promise<ExistingPatient | null>} Patient if present, null otherwise.
 */
export async function getPatient(): Promise<ExistingPatient | null> {
  const [patient] = await db.select().from(patients).limit(1);

  return patient ?? null;
}

/**
 * Creates the patient entry.
 * @param input Patient payload
 * @returns {Promise<ExistingPatient | null>} Created patient, null otherwise.
 * @throws {PatientAlreadyExistsError} patient already exists
 */
export async function createPatient(
  input: CreatePatientDto,
): Promise<ExistingPatient | null> {
  return db.transaction(async (tx) => {
    const [existingPatient] = await tx
      .select({ id: patients.id })
      .from(patients)
      .limit(1);

    if (existingPatient) {
      throw new PatientAlreadyExistsError();
    }

    const [patient] = await tx.insert(patients).values(input).returning();

    return patient ?? null;
  });
}

/**
 * Updates the patient entry.
 * @param input Patient payload
 * @returns {Promise<ExistingPatient | null>} Updated patient, null if no patient exists.
 */
export async function updatePatient(
  input: UpdatePatientDto,
): Promise<ExistingPatient | null> {
  return db.transaction(async (tx) => {
    const [existingPatient] = await tx
      .select({ id: patients.id })
      .from(patients)
      .limit(1);

    if (!existingPatient) {
      return null;
    }

    const [patient] = await tx
      .update(patients)
      .set(input)
      .where(eq(patients.id, existingPatient.id))
      .returning();

    return patient ?? null;
  });
}
