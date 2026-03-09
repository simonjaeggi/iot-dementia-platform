import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { jwtOptions } from "../auth/jwt.config";
import { requireAdmin } from "../auth/auth.middleware";
import { events } from "./event.controller";

export const eventRoutes = new Hono()

// todo distinguish different event types by creating seperate routes and use different access policy 
// IE only mtls authorised devices are allowed to create sensor events
// Users should not be allowed to create events themselves.
// Maybe event creation should go through devices route instead, as authorisation is already implemented and to avoid additionaly reverse proxy configuration.
eventRoutes.use("*", jwt(jwtOptions));
eventRoutes.get("/", events);
