import { z } from "zod";
import { FingerprintSchema } from "../../device/zod/cert-fingerprint.schema";
import { UserRoleSchema } from "../../auth/zod/user-roles.schema";

const DeviceSource = z.object({
  kind: z.literal("device"),
  deviceFingerprint: FingerprintSchema,
  bootId: z.coerce.number().min(1),
  uptimeMs: z.coerce.number().min(1),
});

const BackendSource = z.object({
  kind: z.literal("backend"),
  service: z.enum(["auth", "db", "update"]),
});

const SourceSchema = z.discriminatedUnion("kind", [
  DeviceSource,
  BackendSource,
]);

const BaseEvent = z.object({
  time: z.coerce.date(),
  source: SourceSchema,
});

const EventUserSchema = z.object({
  id: z.coerce.number().min(1),
  email: z.email(),
});

export const InfrastructureStatusSchema = z.enum(["open", "closed"]);
export type InfrastructureStatus = z.infer<typeof InfrastructureStatusSchema>;

const IndoorBeaconSchema = z.object({
  id: z.string().min(1),
  signalStrengthDbm: z.coerce.number(),
});

const IndoorLocationEvent = BaseEvent.extend({
  type: z.literal("indoorLocation"),
  data: z.object({
    beacons: z.array(IndoorBeaconSchema),
  }),
});

const OutdoorLocationEvent = BaseEvent.extend({
  type: z.literal("outdoorLocation"),
  data: z.object({
    lat: z.number(),
    lng: z.number(),
    satelliteCount: z.number().min(1),
    altitudeMeters: z.number(),
  }),
});

const TemperatureEvent = BaseEvent.extend({
  type: z.literal("temperature"),
  data: z.object({
    value: z.number(),
    unit: z.enum(["C", "F"]),
  }),
});

const LightIntensityEvent = BaseEvent.extend({
  type: z.literal("lightIntensity"),
  data: z.object({
    lux: z.number().min(0),
  }),
});

const AccelerationEvent = BaseEvent.extend({
  type: z.literal("acceleration"),
  data: z.object({
    magnitudeG: z.number().min(0),
  }),
});

const NoiseLevelEvent = BaseEvent.extend({
  type: z.literal("noiseLevel"),
  data: z.object({
    approx_db: z.number(),
    dbfs: z.number(),
  }),
});

const HumidityEvent = BaseEvent.extend({
  type: z.literal("humidity"),
  data: z.object({
    percentage: z.number(),
  }),
});

const InfrastructureEvent = BaseEvent.extend({
  type: z.literal("infrastructure"),
  data: z.object({
    status: InfrastructureStatusSchema,
  }),
});

const UpdateAvailableEvent = BaseEvent.extend({
  type: z.literal("updateAvailable"),
  data: z.object({
    version: z.string(),
  }),
});

const CorruptDeviceConfigEvent = BaseEvent.extend({
  type: z.literal("corruptDeviceConfig"),
  data: z.object({
    fallbackVersion: z.coerce.number().int().nonnegative(),
  }),
});

const UserAuditBase = BaseEvent.extend({
  data: z.object({
    user: EventUserSchema,
  }),
});

export const UserAuditEventType = z.enum([
  "login",
  "register",
  "passwordChange",
]);
export type UserAuditType = z.infer<typeof UserAuditEventType>;

const LoginEvent = UserAuditBase.extend({
  type: z.literal(UserAuditEventType.enum.login),
});

const RegisterEvent = UserAuditBase.extend({
  type: z.literal(UserAuditEventType.enum.register),
});

const PasswordChangeEvent = UserAuditBase.extend({
  type: z.literal(UserAuditEventType.enum.passwordChange),
});

const RoleChangeEvent = UserAuditBase.extend({
  type: z.literal("roleChange"),
  data: UserAuditBase.shape.data.extend({
    changedUser: EventUserSchema,
    fromRole: UserRoleSchema,
    toRole: UserRoleSchema,
  }),
});

const AccessCodeEvent = BaseEvent.extend({
  type: z.literal("accessCode"),
  data: z.object({
    user: EventUserSchema,
    action: z.enum(["generated", "invalidated", "redeemed"]),
    codeId: z.string(),
  }),
});

const SystemBootEvent = BaseEvent.extend({
  type: z.literal("systemBoot"),
});

export const EventSchema = z.discriminatedUnion("type", [
  IndoorLocationEvent,
  OutdoorLocationEvent,
  TemperatureEvent,
  LightIntensityEvent,
  AccelerationEvent,
  NoiseLevelEvent,
  HumidityEvent,
  InfrastructureEvent,
  UpdateAvailableEvent,
  CorruptDeviceConfigEvent,
  LoginEvent,
  RegisterEvent,
  PasswordChangeEvent,
  RoleChangeEvent,
  AccessCodeEvent,
  SystemBootEvent,
]);

export type EventDto = z.infer<typeof EventSchema>;
export type NoiseLevelEvent = z.infer<typeof NoiseLevelEvent>