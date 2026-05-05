import { z } from "zod";
import { DeviceFingerprintSchema, TimeOfDaySchema } from "./common";
import {
  InfrastructureStatusSchema,
  type InfrastructureStatus,
} from "./device";

const DELIVERY_METHOD_VALUES = ["email", "push"] as const;
const DETAIL_LEVEL_VALUES = ["none", "title", "full"] as const;
const NUMERIC_THRESHOLD_FIELD_VALUES = [
  "value",
  "percentage",
  "lux",
  "db",
] as const;
const SUBSCRIPTION_TYPE_VALUES = [
  "temperature",
  "humidity",
  "lightIntensity",
  "noiseLevel",
  "updateAvailable",
  "corruptDeviceConfig",
  "systemBoot",
  "login",
  "register",
  "passwordChange",
  "roleChange",
  "accessCode",
  "outdoorGeofenceCrossed",
  "fallDetection",
  "panicDetection",
  "sameRoomTooLong",
  "infrastructureStatusTooLong",
] as const;
const DEVICE_SCOPED_SUBSCRIPTION_TYPE_VALUES = [
  "temperature",
  "humidity",
  "lightIntensity",
  "noiseLevel",
  "corruptDeviceConfig",
  "outdoorGeofenceCrossed",
  "fallDetection",
  "panicDetection",
  "sameRoomTooLong",
  "infrastructureStatusTooLong",
] as const;

export const MAX_PANIC_DETECTION_DURATION_SECONDS = 60;

export type DeliveryMethod = (typeof DELIVERY_METHOD_VALUES)[number];
export type DetailLevel = (typeof DETAIL_LEVEL_VALUES)[number];
export type NumericThresholdField =
  (typeof NUMERIC_THRESHOLD_FIELD_VALUES)[number];
export type SubscriptionType = (typeof SUBSCRIPTION_TYPE_VALUES)[number];
export type DeviceScopedSubscriptionType =
  (typeof DEVICE_SCOPED_SUBSCRIPTION_TYPE_VALUES)[number];

export const DeliveryMethodSchema = z.enum(DELIVERY_METHOD_VALUES);
export const DetailLevelSchema = z.enum(DETAIL_LEVEL_VALUES);
export const NumericThresholdFieldSchema = z.enum(
  NUMERIC_THRESHOLD_FIELD_VALUES,
);
export const SubscriptionTypeSchema = z.enum(SUBSCRIPTION_TYPE_VALUES);
export const DeviceScopedSubscriptionTypeSchema = z.enum(
  DEVICE_SCOPED_SUBSCRIPTION_TYPE_VALUES,
);

export type NumericThresholdConfig = {
  category: "eventNumeric";
  field: NumericThresholdField;
  min: number;
  max: number;
};

export type StateGeofenceThresholdConfig = {
  category: "stateGeoRadius";
  lat: number;
  lng: number;
  radiusMeters: number;
};

export type FallDetectionThresholdConfig = {
  category: "fallDetection";
  minImpactG: number;
  noRoomChangeDelaySeconds: number;
};

export type PanicNoiseLevelDurationThresholdConfig = {
  category: "noiseLevelDuration";
  minDb: number;
  durationSeconds: number;
};

export type IndoorBeaconDurationThresholdConfig = {
  category: "indoorBeaconDuration";
  durationSeconds: number;
  startTime: string;
  endTime: string;
};

export type InfrastructureStateDurationThresholdConfig = {
  category: "infrastructureStateDuration";
  status: InfrastructureStatus;
  durationSeconds: number;
};

export type ThresholdConfig =
  | NumericThresholdConfig
  | StateGeofenceThresholdConfig
  | FallDetectionThresholdConfig
  | PanicNoiseLevelDurationThresholdConfig
  | IndoorBeaconDurationThresholdConfig
  | InfrastructureStateDurationThresholdConfig
  | null;


const NumericThresholdConfigBaseSchema = z
  .object({
    category: z.literal("eventNumeric"),
    field: NumericThresholdFieldSchema,
    min: z.number(),
    max: z.number(),
  })
  .strict();

export const NumericThresholdConfigSchema =
  NumericThresholdConfigBaseSchema.refine(
    (value) => value.min < value.max,
    "Min must be smaller than max.",
  );

const TemperatureThresholdConfigSchema = NumericThresholdConfigBaseSchema.extend(
  {
    field: z.literal("value"),
  },
).refine((value) => value.min < value.max, "Min must be smaller than max.");

const HumidityThresholdConfigSchema = NumericThresholdConfigBaseSchema.extend({
  field: z.literal("percentage"),
}).refine((value) => value.min < value.max, "Min must be smaller than max.");

const NoiseLevelThresholdConfigSchema = NumericThresholdConfigBaseSchema.extend(
  {
    field: z.literal("db"),
  },
).refine((value) => value.min < value.max, "Min must be smaller than max.");

const LightIntensityThresholdConfigSchema =
  NumericThresholdConfigBaseSchema.extend({
    field: z.literal("lux"),
  }).refine((value) => value.min < value.max, "Min must be smaller than max.");

const StateGeofenceThresholdConfigSchema = z
  .object({
    category: z.literal("stateGeoRadius"),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    radiusMeters: z.number().gt(10, "Radius must be greater than 10 meters."),
  })
  .strict();

const IndoorBeaconDurationThresholdConfigSchema = z
  .object({
    category: z.literal("indoorBeaconDuration"),
    durationSeconds: z.number().positive(),
    startTime: TimeOfDaySchema,
    endTime: TimeOfDaySchema,
  })
  .strict();

const PanicNoiseLevelDurationThresholdConfigSchema = z
  .object({
    category: z.literal("noiseLevelDuration"),
    minDb: z.number(),
    durationSeconds: z
      .number()
      .positive()
      .max(
        MAX_PANIC_DETECTION_DURATION_SECONDS,
        `Duration must be at most ${MAX_PANIC_DETECTION_DURATION_SECONDS} seconds.`,
      ),
  })
  .strict();

const FallDetectionThresholdConfigSchema = z
  .object({
    category: z.literal("fallDetection"),
    minImpactG: z.number().positive(),
    noRoomChangeDelaySeconds: z.number().positive(),
  })
  .strict();

const InfrastructureStateDurationThresholdConfigSchema = z
  .object({
    category: z.enum(["infrastructureStateDuration", "stateDuration"]),
    status: InfrastructureStatusSchema,
    durationSeconds: z.number().positive(),
  })
  .strict()
  .transform((value) => ({
    ...value,
    category: "infrastructureStateDuration" as const,
  }));

/**
 * Returns the Zod schema that validates a threshold config payload for a
 * given subscription type. Subscription types that do not carry a threshold
 * return a schema that accepts only null.
 */
export function getThresholdConfigSchema(type: SubscriptionType) {
  switch (type) {
    case "infrastructureStatusTooLong":
      return InfrastructureStateDurationThresholdConfigSchema;
    case "fallDetection":
      return FallDetectionThresholdConfigSchema;
    case "panicDetection":
      return PanicNoiseLevelDurationThresholdConfigSchema;
    case "sameRoomTooLong":
      return IndoorBeaconDurationThresholdConfigSchema;
    case "temperature":
      return TemperatureThresholdConfigSchema.nullable();
    case "humidity":
      return HumidityThresholdConfigSchema.nullable();
    case "lightIntensity":
      return LightIntensityThresholdConfigSchema.nullable();
    case "noiseLevel":
      return NoiseLevelThresholdConfigSchema.nullable();
    case "outdoorGeofenceCrossed":
      return StateGeofenceThresholdConfigSchema;
    default:
      return z.null();
  }
}

export function supportsDeviceSelection(
  type: SubscriptionType,
): type is DeviceScopedSubscriptionType {
  return DEVICE_SCOPED_SUBSCRIPTION_TYPE_VALUES.includes(
    type as DeviceScopedSubscriptionType,
  );
}

const CreateSubscriptionInputSchema = z
  .object({
    type: SubscriptionTypeSchema,
    deviceFingerprint: DeviceFingerprintSchema.optional()
      .nullable()
      .default(null),
    detailLevel: DetailLevelSchema,
    deliveryMethod: DeliveryMethodSchema,
    thresholdConfig: z.unknown().optional().nullable().default(null),
  })
  .strict();

const StoredSubscriptionInputSchema = z
  .object({
    id: z.number().int().positive(),
    userId: z.number().int().positive(),
    type: SubscriptionTypeSchema,
    deviceCertFingerprintSha256: DeviceFingerprintSchema.optional()
      .nullable()
      .default(null),
    detailLevel: DetailLevelSchema,
    deliveryMethod: DeliveryMethodSchema,
    thresholdConfig: z.unknown().optional().nullable().default(null),
  })
  .strict();

export const SubscriptionSchema = StoredSubscriptionInputSchema.transform(
  (value, transformContext) => {
    const thresholdConfigResult = getThresholdConfigSchema(
      value.type,
    ).safeParse(value.thresholdConfig ?? null);

    if (!thresholdConfigResult.success) {
      transformContext.addIssue({
        code: "custom",
        path: ["thresholdConfig"],
        message:
          thresholdConfigResult.error.issues[0]?.message ??
          "Invalid threshold config.",
      });

      return z.NEVER;
    }

    return {
      id: value.id,
      type: value.type,
      deviceCertFingerprintSha256: value.deviceCertFingerprintSha256,
      detailLevel: value.detailLevel,
      deliveryMethod: value.deliveryMethod,
      thresholdConfig: thresholdConfigResult.data,
    };
  },
);

export const CreateSubscriptionSchema = CreateSubscriptionInputSchema.transform(
  (value, transformContext) => {
    if (value.deviceFingerprint && !supportsDeviceSelection(value.type)) {
      transformContext.addIssue({
        code: "custom",
        path: ["deviceFingerprint"],
        message: "This subscription type does not support device selection.",
      });

      return z.NEVER;
    }

    const thresholdConfigResult = getThresholdConfigSchema(
      value.type,
    ).safeParse(value.thresholdConfig ?? null);

    if (!thresholdConfigResult.success) {
      const message =
        value.type === "outdoorGeofenceCrossed"
          ? "House boundary requires latitude, longitude, and radius."
          : value.type === "fallDetection"
            ? "Fall detection requires a minimum impact and no room change delay."
            : value.type === "panicDetection"
              ? `Panic detection requires a noise level and a duration of at most ${MAX_PANIC_DETECTION_DURATION_SECONDS} seconds.`
              : value.type === "sameRoomTooLong"
                ? "Same room too long requires a duration and daily time window."
                : value.type === "infrastructureStatusTooLong"
                  ? "Infrastructure requires a status and duration."
                  : (thresholdConfigResult.error.issues[0]?.message ??
                    "Invalid threshold config.");

      transformContext.addIssue({
        code: "custom",
        path: ["thresholdConfig"],
        message,
      });

      return z.NEVER;
    }

    return {
      ...value,
      thresholdConfig: thresholdConfigResult.data,
    };
  },
);

export const SubscriptionsResponseSchema = z.object({
  subscriptions: z.array(SubscriptionSchema),
});

export const SubscriptionResponseSchema = z.object({
  subscription: SubscriptionSchema,
});

export const SubscriptionIdSchema = z.number().int().positive();

// Explicit high-level types, kept here next to the schemas that produce them.
export type Subscription = {
  id: number;
  type: SubscriptionType;
  deviceCertFingerprintSha256: string | null;
  detailLevel: DetailLevel;
  deliveryMethod: DeliveryMethod;
  thresholdConfig: ThresholdConfig;
};

export type CreateSubscription = {
  type: SubscriptionType;
  deviceFingerprint: string | null;
  detailLevel: DetailLevel;
  deliveryMethod: DeliveryMethod;
  thresholdConfig: ThresholdConfig;
};
