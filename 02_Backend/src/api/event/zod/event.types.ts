import { z } from "zod";
import { EventSchema } from "./event.schema";

export const eventTypeValues = EventSchema.options.map((eventSchema) => {
  const typeLiteral = eventSchema.shape.type;
  return typeLiteral.value;
}) as [string, ...string[]];

export const EventTypeSchema = z.enum(eventTypeValues);

export type EventType = z.infer<typeof EventTypeSchema>;
