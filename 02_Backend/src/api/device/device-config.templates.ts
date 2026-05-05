import { DeviceConfigDto } from "./zod/device-config.schema";

export const emptyDeviceConfigTemplate: DeviceConfigDto = {
  version: 1,
  sensors: [],
};

export const environmentStationConfigTemplate: DeviceConfigDto = {
  version: 1,
  sensors: [
    {
      id: "env-tempHumid",
      type: "temperatureHumidity",
      publishIntervalMs: 30000,
      i2cSdaPin: 6,
      i2cSclPin: 7,
    },
    {
      id: "env-light",
      type: "lightIntensity",
      publishIntervalMs: 30000,
      i2cSdaPin: 6,
      i2cSclPin: 7,
    },
  ],
};

export const infrastructureStationConfigTemplate: DeviceConfigDto = {
  version: 1,
  sensors: [
    {
      id: "infra-hall",
      type: "infrastructureStatus",
      publishIntervalMs: 1000,
      gpioPin: 3,
    },
  ],
};

export const personStationConfigTemplate: DeviceConfigDto = {
  version: 1,
  sensors: [
    {
      id: "person-accel",
      type: "accelerometer",
      publishIntervalMs: 1000,
      pollIntervalMs: 50,
      i2cSdaPin: 6,
      i2cSclPin: 7,
      fallThresholdG: 1.0,
    },
    {
      id: "person-gnss",
      type: "gnss",
      publishIntervalMs: 5000,
      i2cSdaPin: 6,
      i2cSclPin: 7,
    },
    {
      id: "person-noise",
      type: "noiseLevel",
      publishIntervalMs: 1000,
      pollIntervalMs: 100,
      i2sBclkPin: 18,
      i2sLrckPin: 21,
      i2sDinPin: 14,
      noiseThresholdDb: 65,
      dbOffset: 112.8,
    },
    {
      id: "person-location",
      type: "indoorLocation",
      publishIntervalMs: 5000,
      beaconMacAddresses: [],
    },
  ],
};
