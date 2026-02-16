import { Hono } from "hono";
import { config, report } from "./device.mtls.controller";
import { devices, remove, rename } from "./device.web.controller";
import { jwt } from "hono/jwt";
import { jwtOptions } from "../auth/jwt.config";

export const deviceRoutes = new Hono()

deviceRoutes.use("/", jwt(jwtOptions));
deviceRoutes.get("/", devices);

deviceRoutes.use("/delete/:fingerprint", jwt(jwtOptions));
deviceRoutes.delete("/delete/:fingerprint", remove);

deviceRoutes.use("/rename/:fingerprint", jwt(jwtOptions));
deviceRoutes.put("/rename/:fingerprint", rename);

export const mtlsDeviceRoutes = new Hono()
mtlsDeviceRoutes.post("/report", report)
mtlsDeviceRoutes.get("/config", config)
