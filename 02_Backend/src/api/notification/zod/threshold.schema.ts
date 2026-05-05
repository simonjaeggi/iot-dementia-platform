import { z } from "zod";
import { InfrastructureStatusSchema } from "../../event/zod/event.schema";
import { SubscriptionType } from "./subscription.types";

export const NumericThresholdFieldSchema = z.enum([
  "value",
  "percentage",
  "lux",
  "db",
]);
export const ThresholdKindSchema = z.enum([
  "eventNumeric",
  "stateGeoRadius",
  "fallDetection",
  "noiseLevelDuration",
  "indoorBeaconDuration",
  "infrastructureStateDuration",
]);

const TimeOfDaySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:MM format.");

const NumericThresholdConfigBaseSchema = z
  .object({
    category: z.literal(ThresholdKindSchema.enum.eventNumeric),
    field: NumericThresholdFieldSchema,
    min: z.number(),
    max: z.number(),
  })
  .strict();

const NumericThresholdConfigSchema = NumericThresholdConfigBaseSchema.refine(
  (value) => value.min < value.max,
  "Min must be smaller than max.",
);

export const TemperatureThresholdConfigSchema =
  NumericThresholdConfigBaseSchema.extend({
    field: z.literal(NumericThresholdFieldSchema.enum.value),
  }).refine((value) => value.min < value.max, "Min must be smaller than max.");
export const HumidityThresholdConfigSchema =
  NumericThresholdConfigBaseSchema.extend({
    field: z.literal(NumericThresholdFieldSchema.enum.percentage),
  }).refine((value) => value.min < value.max, "Min must be smaller than max.");

export const NoiseLevelThresholdConfigSchema =
  NumericThresholdConfigBaseSchema.extend({
    field: z.literal(NumericThresholdFieldSchema.enum.db),
  }).refine((value) => value.min < value.max, "Min must be smaller than max.");

export const LightIntensityThresholdConfigSchema =
  NumericThresholdConfigBaseSchema.extend({
    field: z.literal(NumericThresholdFieldSchema.enum.lux),
  }).refine((value) => value.min < value.max, "Min must be smaller than max.");

export const StateGeofenceThresholdConfigSchema = z
  .object({
    category: z.literal(ThresholdKindSchema.enum.stateGeoRadius),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    radiusMeters: z.number().gt(10, "Radius must be greater than 10 meters."),
  })
  .strict();

export const IndoorBeaconDurationThresholdConfigSchema = z
  .object({
    category: z.literal(ThresholdKindSchema.enum.indoorBeaconDuration),
    durationSeconds: z.number().positive(),
    startTime: TimeOfDaySchema,
    endTime: TimeOfDaySchema,
  })
  .strict();

export const PanicNoiseLevelDurationThresholdConfigSchema = z
  .object({
    category: z.literal(ThresholdKindSchema.enum.noiseLevelDuration),
    minDb: z.number(),
    durationSeconds: z
      .number()
      .positive()
      .max(60, `Duration must be at most 60 seconds.`),
  })
  .strict();

export const FallDetectionThresholdConfigSchema = z
  .object({
    category: z.literal(ThresholdKindSchema.enum.fallDetection),
    minImpactG: z.number().positive(),
    noRoomChangeDelaySeconds: z.number().positive(),
  })
  .strict();

export const InfrastructureStateDurationThresholdConfigSchema = z
  .object({
    category: z.literal(ThresholdKindSchema.enum.infrastructureStateDuration),
    status: InfrastructureStatusSchema,
    durationSeconds: z.number().positive(),
  })
  .strict();

export type NumericThresholdConfig = z.infer<
  typeof NumericThresholdConfigSchema
>;

export type StateGeofenceThresholdConfig = z.infer<
  typeof StateGeofenceThresholdConfigSchema
>;

export type IndoorBeaconDurationThresholdConfig = z.infer<
  typeof IndoorBeaconDurationThresholdConfigSchema
>;

export type PanicNoiseLevelDurationThresholdConfig = z.infer<
  typeof PanicNoiseLevelDurationThresholdConfigSchema
>;

export type FallDetectionThresholdConfig = z.infer<
  typeof FallDetectionThresholdConfigSchema
>;

export type InfrastructureStateDurationThresholdConfig = z.infer<
  typeof InfrastructureStateDurationThresholdConfigSchema
>;

export type ThresholdConfig =
  | NumericThresholdConfig
  | StateGeofenceThresholdConfig
  | FallDetectionThresholdConfig
  | PanicNoiseLevelDurationThresholdConfig
  | IndoorBeaconDurationThresholdConfig
  | InfrastructureStateDurationThresholdConfig
  | null;

const ThresholdConfigSchemaBySubscriptionType: Record<
  SubscriptionType,
  z.ZodTypeAny
> = {
  temperature: TemperatureThresholdConfigSchema.nullable(),
  humidity: HumidityThresholdConfigSchema.nullable(),
  lightIntensity: LightIntensityThresholdConfigSchema.nullable(),
  noiseLevel: NoiseLevelThresholdConfigSchema.nullable(),
  updateAvailable: z.null(),
  corruptDeviceConfig: z.null(),
  systemBoot: z.null(),
  login: z.null(),
  register: z.null(),
  passwordChange: z.null(),
  roleChange: z.null(),
  accessCode: z.null(),
  outdoorGeofenceCrossed: StateGeofenceThresholdConfigSchema,
  fallDetection: FallDetectionThresholdConfigSchema,
  panicDetection: PanicNoiseLevelDurationThresholdConfigSchema,
  sameRoomTooLong: IndoorBeaconDurationThresholdConfigSchema,
  infrastructureStatusTooLong: InfrastructureStateDurationThresholdConfigSchema,
};

export function getThresholdConfigSchemaForSubscriptionType(
  subscriptionType: SubscriptionType,
): z.ZodType<ThresholdConfig> {
  return ThresholdConfigSchemaBySubscriptionType[
    subscriptionType
  ] as z.ZodType<ThresholdConfig>;
}
