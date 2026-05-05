import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  integer,
  pgTable,
  varchar,
  text,
  timestamp,
  pgEnum,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { DeviceConfigDto } from "../api/device/zod/device-config.schema";
import { userRoles } from "../api/auth/zod/user-roles.schema";
import {
  DeliveryMethodSchema,
  DetailLevelSchema,
} from "../api/notification/zod/delivery.schema";
import type { SubscriptionType } from "../api/notification/zod/subscription.types";
import { ThresholdConfig } from "../api/notification/zod/threshold.schema";
import { eventTypeValues } from "../api/event/zod/event.types";
import type { InfrastructureStatus } from "../api/event/zod/event.schema";

export const userRoleEnum = pgEnum("user_role", userRoles);

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("user"),
  pushId: text("push_id").notNull(),
});

export const accessCodes = pgTable(
  "access_codes",
  {
    code: varchar("code", { length: 14 }).primaryKey().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdByUserId: integer("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
    redeemedByUserId: integer("redeemed_by_user_id").references(
      () => users.id,
      {
        onDelete: "set null",
      },
    ),
    redeemedByEmail: text("redeemed_by_email"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    isInitialAccessCode: boolean("is_initial_access_code")
      .notNull()
      .default(false),
  },
  (table) => [
    uniqueIndex("access_codes_single_initial_access_code_unique")
      .on(table.isInitialAccessCode)
      .where(sql`${table.isInitialAccessCode} = true`),
  ],
);

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

export const softwareVersions = pgTable("software_versions", {
  id: integer().primaryKey().notNull(),
  currentVersion: varchar("current_version", { length: 255 }),
  availableVersion: varchar("available_version", { length: 255 }),
  updateAvailable: boolean("update_available").notNull().default(false),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }).notNull(),
});

export const locationBeacons = pgTable(
  "location_beacons",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    macIdentifier: varchar("mac_identifier", { length: 17 }).notNull(),
  },
  (table) => [
    uniqueIndex("location_beacons_mac_identifier_unique").on(
      table.macIdentifier,
    ),
  ],
);

export const patients = pgTable("patients", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  surname: varchar("surname", { length: 255 }).notNull(),
  lastname: varchar("lastname", { length: 255 }).notNull(),
  birthday: date("birthday", { mode: "string" }).notNull(),
});

export const eventTypeEnum = pgEnum("event_type", eventTypeValues);

const notificationDeliveryMethodValues = DeliveryMethodSchema.options as [
  string,
  ...string[],
];
const notificationDetailLevelValues = DetailLevelSchema.options as [
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

export const events = pgTable(
  "events",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    type: eventTypeEnum("type").notNull(),
    time: timestamp("time", { withTimezone: true }).notNull(),
    data: jsonb("data").notNull(),
  },
  (table) => [
    index("events_time_idx").on(table.time),
    index("events_type_idx").on(table.type),
    index("events_type_time_idx").on(table.type, table.time),
  ],
);

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
  (table) => [
    index("user_notifications_user_createdat_idx").on(
      table.userId,
      table.createdAt,
    ),
    index("user_notifications_user_readat_idx").on(table.userId, table.readAt),
    index("user_notifications_event_idx").on(table.triggerEventId),
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
    type: text("type").$type<SubscriptionType>().notNull(),
    deviceCertFingerprintSha256: varchar("device_cert_fingerprint_sha256", {
      length: 64,
    }).references(() => devices.certFingerprintSha256, {
      onDelete: "cascade",
    }),
    deliveryMethod: notificationDeliveryMethodEnum("delivery_method").notNull(),
    detailLevel: notificationDetailLevelEnum("detail_level").notNull(),
    thresholdConfig: jsonb("threshold_config").$type<ThresholdConfig>(),
  },
  (table) => [
    uniqueIndex("user_event_subscriptions_unique").on(
      table.userId,
      table.type,
      table.deliveryMethod,
      table.detailLevel,
      table.deviceCertFingerprintSha256,
    ),
    index("user_event_subscriptions_user_event").on(
      table.userId,
      table.type,
      table.deviceCertFingerprintSha256,
    ),
  ],
);

export const infrastructureStates = pgTable(
  "infrastructure_states",
  {
    deviceCertFingerprintSha256: varchar("device_cert_fingerprint_sha256", {
      length: 64,
    })
      .primaryKey()
      .references(() => devices.certFingerprintSha256, {
        onDelete: "cascade",
      }),
    status: varchar("status", { length: 64 })
      .$type<InfrastructureStatus>()
      .notNull(),
    statusSince: timestamp("status_since", { withTimezone: true }).notNull(),
    lastObservedAt: timestamp("last_observed_at", {
      withTimezone: true,
    }).notNull(),
    nextCheckAt: timestamp("next_check_at", { withTimezone: true }),
    lastEventId: integer("last_event_id").references(() => events.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("infrastructure_states_status_nextcheckat_idx").on(
      table.status,
      table.nextCheckAt,
    ),
    index("infrastructure_states_last_event_idx").on(table.lastEventId),
  ],
);

export const outdoorLocationStates = pgTable(
  "outdoor_location_states",
  {
    deviceCertFingerprintSha256: varchar("device_cert_fingerprint_sha256", {
      length: 64,
    })
      .primaryKey()
      .references(() => devices.certFingerprintSha256, {
        onDelete: "cascade",
      }),
    latestLat: doublePrecision("latest_lat").notNull(),
    latestLng: doublePrecision("latest_lng").notNull(),
    latestAltitudeMeters: doublePrecision("latest_altitude_meters").notNull(),
    latestSatelliteCount: integer("latest_satellite_count").notNull(),
    previousLat: doublePrecision("previous_lat"),
    previousLng: doublePrecision("previous_lng"),
    previousAltitudeMeters: doublePrecision("previous_altitude_meters"),
    previousSatelliteCount: integer("previous_satellite_count"),
    previousObservedAt: timestamp("previous_observed_at", {
      withTimezone: true,
    }),
    lastObservedAt: timestamp("last_observed_at", {
      withTimezone: true,
    }).notNull(),
    lastEventId: integer("last_event_id").references(() => events.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("outdoor_location_states_last_observed_at_idx").on(
      table.lastObservedAt,
    ),
    index("outdoor_location_states_last_event_idx").on(table.lastEventId),
  ],
);

export const indoorLocationStates = pgTable(
  "indoor_location_states",
  {
    deviceCertFingerprintSha256: varchar("device_cert_fingerprint_sha256", {
      length: 64,
    })
      .primaryKey()
      .references(() => devices.certFingerprintSha256, {
        onDelete: "cascade",
      }),
    currentBeaconMacIdentifier: varchar("current_beacon_mac_identifier", {
      length: 17,
    }).references(() => locationBeacons.macIdentifier, {
      onDelete: "set null",
    }),
    previousBeaconMacIdentifier: varchar("previous_beacon_mac_identifier", {
      length: 17,
    }).references(() => locationBeacons.macIdentifier, {
      onDelete: "set null",
    }),
    beaconSince: timestamp("beacon_since", { withTimezone: true }),
    previousObservedAt: timestamp("previous_observed_at", {
      withTimezone: true,
    }),
    lastObservedAt: timestamp("last_observed_at", {
      withTimezone: true,
    }).notNull(),
    lastEventId: integer("last_event_id").references(() => events.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("indoor_location_states_current_beacon_last_observed_idx").on(
      table.currentBeaconMacIdentifier,
      table.lastObservedAt,
    ),
    index("indoor_location_states_last_event_idx").on(table.lastEventId),
  ],
);

export const fallDetectionStates = pgTable(
  "fall_detection_states",
  {
    deviceCertFingerprintSha256: varchar("device_cert_fingerprint_sha256", {
      length: 64,
    })
      .primaryKey()
      .references(() => devices.certFingerprintSha256, {
        onDelete: "cascade",
      }),
    candidateStartedAt: timestamp("candidate_started_at", {
      withTimezone: true,
    }),
    triggerAccelerationMagnitudeG: doublePrecision(
      "trigger_acceleration_magnitude_g",
    ),
    triggerAccelerationEventId: integer(
      "trigger_acceleration_event_id",
    ).references(() => events.id, {
      onDelete: "set null",
    }),
    triggerBeaconMacIdentifier: varchar("trigger_beacon_mac_identifier", {
      length: 17,
    }).references(() => locationBeacons.macIdentifier, {
      onDelete: "set null",
    }),
    lastObservedBeaconMacIdentifier: varchar(
      "last_observed_beacon_mac_identifier",
      {
        length: 17,
      },
    ).references(() => locationBeacons.macIdentifier, {
      onDelete: "set null",
    }),
    lastObservedAt: timestamp("last_observed_at", {
      withTimezone: true,
    }).notNull(),
    lastEventId: integer("last_event_id").references(() => events.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("fall_detection_states_candidate_started_at_idx").on(
      table.candidateStartedAt,
    ),
    index("fall_detection_states_last_event_idx").on(table.lastEventId),
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
    providerMessageId: text("provider_message_id"),
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
