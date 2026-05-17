import { eq, gte, and, desc, count } from "drizzle-orm";
import { db } from "../../db/db";
import { events } from "../../db/schema";
import { EventDto } from "./zod/event.schema";
import { EventIdDto } from "./zod/event-id.schema";
import { processStatelessNotifications } from "../notification/stateless/stateless-notification.service";
import { updateDerivedStates } from "./derived-state/derived-state.service";
import { ExistingEvent } from "../../db/types";
import { EventType } from "./zod/event.types";

export type PaginatedEvents = {
  data: ExistingEvent[];
  totalRows: number;
  pageNumber: number;
  pageSize: number;
};

/**
 * Returns paginated events.
 * @param pageNumber current page that is requested
 * @param pageSize requested size of page
 * @param eventType event type to filter by
 * @returns {Promise<PaginatedEvents>} list of events with pagination data
 */
export async function getEvents(
  pageNumber: number,
  pageSize: number,
  eventType?: EventType,
): Promise<PaginatedEvents> {
  const safePageSize = Math.min(Math.max(1, pageSize), 100);
  const where = eventType ? eq(events.type, eventType) : undefined;
  const rows = await db
    .select()
    .from(events)
    .where(where)
    .orderBy(desc(events.time))
    .offset((pageNumber - 1) * safePageSize)
    .limit(safePageSize);

  const [totalRows] = await db
    .select({ count: count() })
    .from(events)
    .where(where);

  return {
    data: rows,
    totalRows: totalRows.count,
    pageNumber,
    pageSize: safePageSize,
  };
}

/**
 * Returns the events of the last x days, optionally by type.
 * @param eventType type to retrieve
 * @param days x days
 * @returns {Promise<ExistingEvent[]>} Event list
 */
export async function getEventsByTypeAndLastXDays(
  days: number,
  eventType?: EventType,
): Promise<ExistingEvent[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const where = eventType
    ? and(gte(events.time, startDate), eq(events.type, eventType))
    : gte(events.time, startDate);

  const rows = await db.select().from(events).where(where);
  return rows;
}

/**
 * Returns all events of a given type in the last x seconds.
 * @param eventType type to retrieve
 * @param seconds amount of seconds to go back
 * @returns {Promise<ExistingEvent[]>} Event list
 */
export async function getEventsByTypeAndLastXSeconds(
  eventType: EventType,
  seconds: number,
): Promise<ExistingEvent[]> {
  const cutoffTime = new Date(Date.now() - seconds * 1000);

  const rows = await db
    .select()
    .from(events)
    .where(and(eq(events.type, eventType), gte(events.time, cutoffTime)))
    .orderBy(desc(events.time));

  return rows as ExistingEvent[];
}

/**
 * Returns the latest event of a given type.
 * @param eventType type to retrieve
 * @returns {Promise<ExistingEvent | null>} Event if found, null otherwise.
 */
export async function getLatestEventByType(
  eventType: EventType,
): Promise<ExistingEvent | null> {
  const [row] = await db
    .select({
      id: events.id,
      type: events.type,
      time: events.time,
      data: events.data,
    })
    .from(events)
    .where(eq(events.type, eventType))
    .orderBy(desc(events.time), desc(events.id))
    .limit(1);

  if (!row) {
    return null;
  }
  return row;
}

/**
 * Returns an event by id.
 * @param id Event id
 * @returns {Promise<StoredEvent | null>} Event if found, null otherwise.
 */
export async function getEventById(
  id: EventIdDto,
): Promise<ExistingEvent | null> {
  const [row] = await db
    .select({
      id: events.id,
      type: events.type,
      time: events.time,
      data: events.data,
    })
    .from(events)
    .where(eq(events.id, id))
    .limit(1);

  if (!row) {
    return null;
  }
  return row;
}

/**
 * Creates a new event. Triggers notification processing and derived state updates.
 * @param event Event payload
 * @returns {Promise<StoredEvent | null>} Created event with id, null otherwise.
 */
export async function createEvent(
  event: EventDto,
): Promise<ExistingEvent | null> {
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

  await updateDerivedStates(row.id, event);
  await processStatelessNotifications(row.id, event);

  return row;
}
