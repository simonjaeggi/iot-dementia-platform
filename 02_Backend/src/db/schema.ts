import {
  integer,
  pgTable,
  varchar,
  text,
  timestamp,
  uuid,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { DeviceConfig } from "../api/device/zod/device-config.schema";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("user"),
});

export const refreshSessions = pgTable("refresh_sessions", {
  id: uuid("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const accessCodes = pgTable("access_codes", {
  code: varchar("code", { length: 14 }).primaryKey().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdByUserId: integer("created_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
  redeemedByUserId: integer("redeemed_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  redeemedByEmail: text("redeemed_by_email"),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});


export const deviceCertificates = pgTable("device_certificates", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  certSubj: varchar("cert_subj", { length: 255 }).notNull().unique(),
  certFingerprintSha256: varchar("cert_fingerprint_sha256", { length: 64 })
    .notNull()
    .unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export const devices = pgTable("devices", {
  certFingerprintSha256: varchar("cert_fingerprint_sha256", { length: 64 })
    .notNull()
    .unique()
    .primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeen: timestamp("last_seen", {withTimezone: true}),
  config: jsonb("config").$type<DeviceConfig>().notNull(),
});

