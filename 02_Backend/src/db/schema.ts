import {
  integer,
  pgTable,
  varchar,
  text,
  timestamp,
  uuid,
  pgEnum,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { DeviceConfigDto } from "../api/device/zod/device-config.schema";
import { EventSchema } from "../api/event/zod/event.schema";
import { userRoles } from "../api/auth/zod/user-roles.schema";
import {
  NotificationDeliveryMethodSchema,
  NotificationDetailLevelSchema,
} from "../api/notification/zod/notification-subscription.schema";

export const userRoleEnum = pgEnum("user_role", userRoles);

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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export const devices = pgTable("devices", {
  certFingerprintSha256: varchar("cert_fingerprint_sha256", { length: 64 })
    .notNull()
    .unique()
    .primaryKey(),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastSeen: timestamp("last_seen", { withTimezone: true }),
  config: jsonb("config").$type<DeviceConfigDto>().notNull(),
});

const eventTypeValues = EventSchema.options.map((eventSchema) => {
  const typeLiteral = eventSchema.shape.type;
  return typeLiteral.value;
}) as [string, ...string[]];

export const eventTypeEnum = pgEnum("event_type", eventTypeValues);

const notificationDeliveryMethodValues =
  NotificationDeliveryMethodSchema.options as [string, ...string[]];
const notificationDetailLevelValues = NotificationDetailLevelSchema.options as [
  string,
  ...string[],
];

export const notificationDeliveryMethodEnum = pgEnum(
  "notification_delivery_method",
  notificationDeliveryMethodValues,
);
export const notificationDetailLevelEnum = pgEnum(
  "notification_detail_level",
  notificationDetailLevelValues,
);

export const events = pgTable("events", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  type: eventTypeEnum("type").notNull(),
  time: timestamp("time", { withTimezone: true }).notNull(),
  data: jsonb("data").notNull(),
});

export const userNotifications = pgTable(
  "user_notifications",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    triggerEventId: integer("trigger_event_id").references(() => events.id, {
      onDelete: "set null", 
    }),

    title: varchar("title", { length: 128 }).notNull(),
    message: text("message").notNull(),

    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => [
    index("user_notifications_user_createdat_idx").on(t.userId, t.createdAt),
    index("user_notifications_user_readat_idx").on(t.userId, t.readAt),
    index("user_notifications_event_idx").on(t.triggerEventId),
  ],
);

export const userEventSubscriptions = pgTable(
  "user_event_subscriptions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),
    eventType: eventTypeEnum("event_type").notNull(),
    deliveryMethod: notificationDeliveryMethodEnum("delivery_method").notNull(),
    detailLevel: notificationDetailLevelEnum("detail_level").notNull(),
  },
  (table) => [
    uniqueIndex("user_event_subscriptions_unique").on(
      table.userId,
      table.eventType,
      table.deliveryMethod,
      table.detailLevel,
    ),
    index("user_event_subscriptions_user_event").on(
      table.userId,
      table.eventType,
    ),
  ],
);

export const userNotificationTransport = pgTable(
  "user_notification_transport",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    userNotificationId: integer("user_notification_id")
      .notNull()
      .references(() => userNotifications.id, { onDelete: "cascade" }),
    userEventSubscriptionId: integer("user_event_subscription_id")
      .notNull()
      .references(() => userEventSubscriptions.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("user_notification_transport_unique").on(
      table.userNotificationId,
      table.userEventSubscriptionId,
    ),
    index("user_notification_transport_notification_idx").on(
      table.userNotificationId,
    ),
    index("user_notification_transport_subscription_idx").on(
      table.userEventSubscriptionId,
    ),
  ],
);
