import { z } from "zod";
import { InfrastructureStatusSchema } from "../../event/zod/event.schema";
import { SubscriptionType } from "./subscription.types";

export const NumericThresholdFieldSchema = z.enum([
  "value",
  "percentage",
  "db",
]);
export const ThresholdKindSchema = z.enum([
  "eventNumeric",
  "stateGeoRadius",
  "stateDuration",
]);

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

export const StateGeofenceThresholdConfigSchema = z
  .object({
    category: z.literal(ThresholdKindSchema.enum.stateGeoRadius),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    radiusMeters: z.number().gt(10, "Radius must be greater than 10 meters."),
  })
  .strict();

export const StateDurationThresholdConfigSchema = z
  .object({
    category: z.literal(ThresholdKindSchema.enum.stateDuration),
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

export type StateDurationThresholdConfig = z.infer<
  typeof StateDurationThresholdConfigSchema
>;

export type ThresholdConfig =
  | NumericThresholdConfig
  | StateGeofenceThresholdConfig
  | StateDurationThresholdConfig
  | null;

const ThresholdConfigSchemaBySubscriptionType: Record<
  SubscriptionType,
  z.ZodTypeAny
> = {
  temperature: TemperatureThresholdConfigSchema.nullable(),
  humidity: HumidityThresholdConfigSchema.nullable(),
  noiseLevel: NoiseLevelThresholdConfigSchema.nullable(),
  updateAvailable: z.null(),
  systemBoot: z.null(),
  login: z.null(),
  register: z.null(),
  passwordChange: z.null(),
  roleChange: z.null(),
  accessCode: z.null(),
  outdoorGeofenceCrossed: StateGeofenceThresholdConfigSchema,
  infrastructureStatusTooLong: StateDurationThresholdConfigSchema,
};

export function getThresholdConfigSchemaForSubscriptionType(
  subscriptionType: SubscriptionType,
): z.ZodType<ThresholdConfig> {
  return ThresholdConfigSchemaBySubscriptionType[
    subscriptionType
  ] as z.ZodType<ThresholdConfig>;
}
