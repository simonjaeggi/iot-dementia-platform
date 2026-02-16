import { Hono } from "hono";
import { authRoutes } from "./auth/auth.routes";
import { deviceRoutes, mtlsDeviceRoutes } from "./device/device.routes";
import { db } from "../db/db";
import { sql } from "drizzle-orm/sql";

export const apiRoutes = new Hono();
apiRoutes.get("/health", async (c) => {
  try {
    await db.execute(sql`SELECT 1`);
    return c.json({ ok: true, db: "up" });
  } catch (err) {
    console.error("DB healthcheck failed:", err);
    return c.json({ ok: false, db: "down" }, 500);
  }
});
apiRoutes.route("/auth", authRoutes);
apiRoutes.route("/device/web", deviceRoutes);
apiRoutes.route("/device/mtls", mtlsDeviceRoutes);
