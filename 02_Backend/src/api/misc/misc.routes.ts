import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { jwtOptions } from "../auth/jwt.config";
import { requireAdmin } from "../auth/auth.middleware";
import {
  createLocationBeacon,
  createPatient,
  locationBeacons,
  patient,
  removeLocationBeacon,
  updatePatient,
} from "./misc.controller";

export const miscRoutes = new Hono();

miscRoutes.use("*", jwt(jwtOptions));

miscRoutes.get("/location-beacon", locationBeacons);
miscRoutes.get("/patient", patient);

miscRoutes.use("*", requireAdmin());

miscRoutes.post("/location-beacon", createLocationBeacon);
miscRoutes.delete("/location-beacon/:id", removeLocationBeacon);
miscRoutes.post("/patient", createPatient);
miscRoutes.put("/patient", updatePatient);
