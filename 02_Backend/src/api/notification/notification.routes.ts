import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { jwtOptions } from "../auth/jwt.config";
import {
  markAllAsRead,
  notifications,
  notificationSubscriptions,
  removeAll,
  subscribeToNotifications,
  unsubscribeFromNotifications,
} from "./notification.controller";

export const notificationRoutes = new Hono();

notificationRoutes.use("*", jwt(jwtOptions));

notificationRoutes.get("/", notifications);
notificationRoutes.post("/mark-all-read", markAllAsRead);
notificationRoutes.delete("/all", removeAll);
notificationRoutes.get("/subscriptions", notificationSubscriptions);
notificationRoutes.post("/subscriptions", subscribeToNotifications);
notificationRoutes.delete("/subscriptions/:id", unsubscribeFromNotifications);
