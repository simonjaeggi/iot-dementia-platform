import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { createEvent, getEventById, getEvents } from "./event.service";
import { EventSchema } from "./zod/event.schema";
import { EventIdSchema } from "./zod/event-id.schema";
import { GetEventsSchema } from "./zod/get-events.schema";

/**
 * Creates an event.
 * @param c HTTP context containing event payload
 * @returns HTTP JSON response containing the created event.
 * @throws {HTTPException} 400 payload invalid
 * @throws {HTTPException} 500 failed to create event
 */
export async function create(c: Context) {
  const body = await c.req.json().catch(() => null);
  const dtoResult = EventSchema.safeParse(body);

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
 * Returns paginated events.
 * @param c HTTP context
 * @returns HTTP JSON response containing a list of events.
 * @throws {HTTPException} 400 payload invalid
 */
export async function events(c: Context) {
  const dtoResult = GetEventsSchema.safeParse(c.req.query());

  if (!dtoResult.success) {
    throw new HTTPException(400, {
      message: dtoResult.error.issues[0]?.message ?? "Invalid payload.",
    });
  }
  const result = await getEvents(
    dtoResult.data.pageNumber,
    dtoResult.data.pageSize,
    dtoResult.data.type,
  );

  return c.json(result);
}

/**
 * Returns an event.
 * @param c HTTP context containing event id param
 * @returns HTTP JSON response containing the event.
 * @throws {HTTPException} 400 event id invalid
 * @throws {HTTPException} 404 event not found
 */
export async function event(c: Context) {
  const idResult = EventIdSchema.safeParse(c.req.param("eventId"));
  if (!idResult.success) {
    throw new HTTPException(400, { message: "Invalid event id." });
  }
  const id = idResult.data;

  const event = await getEventById(id);
  if (!event) {
    throw new HTTPException(404, { message: "Event not found." });
  }

  return c.json(event);
}
