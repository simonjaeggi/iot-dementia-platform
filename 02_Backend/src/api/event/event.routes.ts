import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { jwtOptions } from "../auth/jwt.config";

import { events, event  } from "./event.controller";

export const eventRoutes = new Hono()

eventRoutes.use("*", jwt(jwtOptions));
eventRoutes.get("/", events);
eventRoutes.get("/:eventId", event);