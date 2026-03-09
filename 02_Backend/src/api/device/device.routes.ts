import { Hono } from "hono";
import { config, createDeviceEvent, report } from "./device.mtls.controller";
import { devices, remove, rename } from "./device.web.controller";
import { jwt } from "hono/jwt";
import { jwtOptions } from "../auth/jwt.config";
import { requireAdmin } from "../auth/auth.middleware";

export const deviceRoutes = new Hono()

deviceRoutes.use("/", jwt(jwtOptions));
deviceRoutes.get("/", devices);

deviceRoutes.use("/delete", jwt(jwtOptions));
deviceRoutes.use("/delete", requireAdmin());
deviceRoutes.delete("/delete", remove);

deviceRoutes.use("/rename", jwt(jwtOptions));
deviceRoutes.use("/rename", requireAdmin());
deviceRoutes.put("/rename", rename);

export const mtlsDeviceRoutes = new Hono()
mtlsDeviceRoutes.post("/report", report)
mtlsDeviceRoutes.post("/event", createDeviceEvent)
mtlsDeviceRoutes.get("/config", config)
