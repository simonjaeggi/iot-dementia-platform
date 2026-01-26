import { Hono } from "hono";
import { db } from "../db/db";
import { sql } from "drizzle-orm";

export const publicRoutes = new Hono()
publicRoutes.get("/health", async (c) => {
  try {
    await db.execute(sql`SELECT 1`);
    return c.json({ ok: true, db: "up" });
  } catch (err) {
    console.error("DB healthcheck failed:", err);
    return c.json({ ok: false, db: "down" }, 500);
  }
});