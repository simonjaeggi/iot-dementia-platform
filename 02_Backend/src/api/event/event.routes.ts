import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { jwtOptions } from "../auth/jwt.config";

import {
  event,
  events,
  eventsByTypeAndDays,
  eventsByTypeAndSeconds,
  latestEventByType,
} from "./event.controller";

export const eventRoutes = new Hono()

eventRoutes.use("*", jwt(jwtOptions));
eventRoutes.get("/", events);
eventRoutes.get("/latest", latestEventByType);
eventRoutes.get("/eventsByTypeAndDays", eventsByTypeAndDays);
eventRoutes.get("/eventsByTypeAndSeconds", eventsByTypeAndSeconds);
eventRoutes.get("/:eventId", event);
