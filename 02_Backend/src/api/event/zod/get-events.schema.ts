import { z } from "zod";
import { EventTypeSchema } from "./event.types";

export const GetEventsSchema = z
  .object({
    pageNumber: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(25),
    type: EventTypeSchema.optional(),
  })
  .strict();

export type GetEventsDto = z.infer<
  typeof GetEventsSchema
>;
