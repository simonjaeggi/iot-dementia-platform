import { z } from "zod";
import { EventTypeSchema } from "./event.types";

export const GetEventsSchema = z
  .object({
    pageNumber: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(25),
    type: EventTypeSchema.optional(),
  })
  .strict();

export type GetEventsDto = z.infer<typeof GetEventsSchema>;

export const GetLatestEventByTypeSchema = z
  .object({
    type: EventTypeSchema,
  })
  .strict();

export const GetEventsByTypeAndDaysSchema = z.object({
  days: z
    .coerce.number()
    .int()
    .positive()
    .max(30, "Events can only be fetched by type for up to the last 30 days."),
  eventType: EventTypeSchema,
});

export const GetEventsByTypeAndSecondsSchema = z.object({
  seconds: z
    .coerce.number()
    .int()
    .positive()
    .max(86_400, "Events can only be fetched by type for up to the last day."),
  eventType: EventTypeSchema,
});
