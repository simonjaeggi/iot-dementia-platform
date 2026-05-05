import { z } from "zod";
import { DeviceFingerprintSchema } from "./common";

const INFRASTRUCTURE_STATUS_VALUES = ["open", "closed"] as const;
export type InfrastructureStatus =
  (typeof INFRASTRUCTURE_STATUS_VALUES)[number];
export const InfrastructureStatusSchema = z.enum(INFRASTRUCTURE_STATUS_VALUES);

export type IndoorLocationSensor = {
  id: string;
  type: "indoorLocation";
  publishIntervalMs: number;
  beaconMacAddresses: string[];
};

export type TemperatureHumiditySensor = {
  id: string;
  type: "temperatureHumidity";
  publishIntervalMs: number;
  i2cSdaPin: number;
  i2cSclPin: number;
};

export type LightIntensitySensor = {
  id: string;
  type: "lightIntensity";
  publishIntervalMs: number;
  i2cSdaPin: number;
  i2cSclPin: number;
};

export type InfrastructureStatusSensor = {
  id: string;
  type: "infrastructureStatus";
  publishIntervalMs: number;
  gpioPin: number;
};

export type AccelerometerSensor = {
  id: string;
  type: "accelerometer";
  publishIntervalMs: number;
  i2cSdaPin: number;
  i2cSclPin: number;
};

export type GnssSensor = {
  id: string;
  type: "gnss";
  publishIntervalMs: number;
  i2cSdaPin: number;
  i2cSclPin: number;
};

export type NoiseLevelSensor = {
  id: string;
  type: "noiseLevel";
  publishIntervalMs: number;
  i2sBclkPin: number;
  i2sLrckPin: number;
  i2sDinPin: number;
};

export type DeviceSensor =
  | IndoorLocationSensor
  | TemperatureHumiditySensor
  | LightIntensitySensor
  | InfrastructureStatusSensor
  | AccelerometerSensor
  | GnssSensor
  | NoiseLevelSensor;

export type DeviceConfig = {
  version: number;
  sensors: DeviceSensor[];
};

export type ApiDevice = {
  name: string | null;
  certFingerprintSha256: string;
  createdAt: string;
  lastSeen: string | null;
  downSeconds: number | null;
  config: DeviceConfig;
};

export type DeviceType =
  | "environmentStation"
  | "infrastructureStation"
  | "personStation";

export const DeviceSummarySchema = z.object({
  certFingerprintSha256: DeviceFingerprintSchema,
  name: z.string().nullable(),
});

export const DevicesResponseSchema = z.object({
  devices: z.array(DeviceSummarySchema),
});

export type DeviceSummary = z.infer<typeof DeviceSummarySchema>;

export const DEVICE_TYPE_VALUES = [
  "environmentStation",
  "infrastructureStation",
  "personStation",
];
/**
 * Simple helper that checks which config template a device currently uses.
 */
export function detectDeviceType(config: DeviceConfig): DeviceType | null {
  const sensorTypes = new Set(config.sensors.map((sensor) => sensor.type));

  if (
    sensorTypes.size === 2 &&
    sensorTypes.has("temperatureHumidity") &&
    sensorTypes.has("lightIntensity")
  ) {
    return "environmentStation";
  }

  if (sensorTypes.size === 1 && sensorTypes.has("infrastructureStatus")) {
    return "infrastructureStation";
  }

  if (
    sensorTypes.size === 4 &&
    sensorTypes.has("accelerometer") &&
    sensorTypes.has("gnss") &&
    sensorTypes.has("noiseLevel") &&
    sensorTypes.has("indoorLocation")
  ) {
    return "personStation";
  }

  return null;
}
