import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { jwtOptions } from "../auth/jwt.config";
import {
  notifications,
  notificationSubscriptions,
  subscribeToNotifications,
  unsubscribeFromNotifications,
} from "./notification.controller";

export const notificationRoutes = new Hono();

notificationRoutes.use("*", jwt(jwtOptions));

notificationRoutes.get("/", notifications);
notificationRoutes.get("/subscriptions", notificationSubscriptions);
notificationRoutes.post("/subscriptions", subscribeToNotifications);
notificationRoutes.delete("/subscriptions/:id", unsubscribeFromNotifications);
