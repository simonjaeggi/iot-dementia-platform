import { z } from "zod";
import { MacAddressSchema } from "./mac-address.schema";

const SensorBaseSchema = z.object({
  id: z.string().max(16),
  publishIntervalMs: z.number().int().positive(),
});

const IndoorLocationSensor = SensorBaseSchema.extend({
  type: z.literal("indoorLocation"),
  beaconMacAddresses: z.array(MacAddressSchema),
});

const HumidityTempSensor = SensorBaseSchema.extend({
  type: z.literal("temperatureHumidity"),
  i2cSdaPin: z.number().min(1),
  i2cSclPin: z.number().min(1),
});

const LightSensor = SensorBaseSchema.extend({
  type: z.literal("lightIntensity"),
  i2cSdaPin: z.number().min(1),
  i2cSclPin: z.number().min(1),
});

const HallEffectSensor = SensorBaseSchema.extend({
  type: z.literal("infrastructureStatus"),
  gpioPin: z.number().int().min(1),
});

const AccelerometerSensor = SensorBaseSchema.extend({
  type: z.literal("accelerometer"),
  pollIntervalMs: z.number().int().positive(),
  i2cSdaPin: z.number().min(1),
  i2cSclPin: z.number().min(1),
  fallThresholdG: z.number().positive(),
});

const GnssSensor = SensorBaseSchema.extend({
  type: z.literal("gnss"),
  i2cSdaPin: z.number().min(1),
  i2cSclPin: z.number().min(1),
});

const NoiseLevelSensor = SensorBaseSchema.extend({
  type: z.literal("noiseLevel"),
  pollIntervalMs: z.number().int().positive(),
  i2sBclkPin: z.number().int().min(1),
  i2sLrckPin: z.number().int().min(1),
  i2sDinPin: z.number().int().min(1),
  noiseThresholdDb: z.number(),
  dbOffset: z.number().default(112.8),
});

const SensorSchema = z.discriminatedUnion("type", [
  IndoorLocationSensor,
  HumidityTempSensor,
  LightSensor,
  HallEffectSensor,
  AccelerometerSensor,
  GnssSensor,
  NoiseLevelSensor,
]);

export const DeviceConfigSchema = z
  .object({
    version: z.number(),
    sensors: z.array(SensorSchema),
  })
  .superRefine((config, ctx) => {
    const i2cSensors = config.sensors
      .map((sensor, index) => ({ sensor, index }))
      .filter(
        (
          entry,
        ): entry is {
          index: number;
          sensor:
            | z.infer<typeof HumidityTempSensor>
            | z.infer<typeof LightSensor>
            | z.infer<typeof AccelerometerSensor>
            | z.infer<typeof GnssSensor>;
        } =>
          "i2cSdaPin" in entry.sensor && "i2cSclPin" in entry.sensor,
      );

    if (i2cSensors.length <= 1) {
      return;
    }

    const expected = i2cSensors[0]!.sensor;

    for (const { sensor, index } of i2cSensors.slice(1)) {
      if (
        sensor.i2cSdaPin === expected.i2cSdaPin &&
        sensor.i2cSclPin === expected.i2cSclPin
      ) {
        continue;
      }

      ctx.addIssue({
        code: "custom",
        path: ["sensors", index],
        message:
          "All I2C sensors on a device must use the same i2cSdaPin and i2cSclPin.",
      });
    }
  });

export type DeviceConfigDto = z.infer<typeof DeviceConfigSchema>;
