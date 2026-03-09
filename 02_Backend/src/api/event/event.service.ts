import { asc, eq } from "drizzle-orm";
import { db } from "../../db/db";
import { events } from "../../db/schema";
import { EventDto } from "./zod/event.schema";
import { EventIdDto } from "./zod/event-id.schema";
import { mapEventToNotifications } from "../notification/notification.service";

export type StoredEvent = EventDto & { id: EventIdDto };

/**
 * Returns all events.
 * @returns {Promise<StoredEvent[]>} Event list
 */
export async function getEvents(): Promise<StoredEvent[]> {
  const rows = await db.select().from(events);

  return rows.map((row) => ({
    id: row.id,
    ...(row.data as EventDto),
  }));
}

/**
 * Returns an event by id.
 * @param id Event id
 * @returns {Promise<StoredEvent | null>} Event if found, null otherwise.
 */
export async function getEventById(
  id: EventIdDto,
): Promise<StoredEvent | null> {
  const rows = await db
    .select({
      id: events.id,
      type: events.type,
      time: events.time,
      data: events.data,
    })
    .from(events)
    .where(eq(events.id, id))
    .limit(1);

  if (!rows[0]) {
    return null;
  }

  return { id: rows[0].id, ...(rows[0].data as EventDto) };
}

/**
 * Creates a new event.
 * @param event Event payload
 * @returns {Promise<StoredEvent | null>} Created event with id, null otherwise.
 */
export async function createEvent(
  event: EventDto,
): Promise<StoredEvent | null> {
  const [row] = await db
    .insert(events)
    .values({
      type: event.type,
      time: event.time,
      data: event,
    })
    .returning({
      id: events.id,
      type: events.type,
      time: events.time,
      data: events.data,
    });

  if (!row) {
    return null;
  }

  await mapEventToNotifications(row.id, event);

  return { id: row.id, ...(row.data as EventDto) };
}
