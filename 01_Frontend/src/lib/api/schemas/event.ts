type DeviceEventSource = {
  kind: "device";
  deviceFingerprint?: string;
  bootId?: number;
  uptimeMs?: number;
};

type BackendEventSource = {
  kind: "backend";
  service?: "auth" | "db";
};

type UserEventSource = {
  kind: "user";
  userId?: string;
  userEmail?: string;
};

export type ApiEventSource =
  | DeviceEventSource
  | BackendEventSource
  | UserEventSource;

export type ApiEvent = {
  id: number;
  type: string;
  time: string;
  data: {
    type: string;
    time: string;
    source: ApiEventSource;
    data?: unknown;
  };
};

export type EventsResponse = {
  data: ApiEvent[];
  totalRows: number;
  pageNumber: number;
  pageSize: number;
};

export const EVENT_TYPES = [
  "accessCode",
  "acceleration",
  "corruptDeviceConfig",
  "humidity",
  "indoorLocation",
  "infrastructure",
  "lightIntensity",
  "login",
  "noiseLevel",
  "outdoorLocation",
  "register",
  "roleChange",
  "systemBoot",
  "temperature",
  "updateAvailable",
  "userDelete",
] as const;
