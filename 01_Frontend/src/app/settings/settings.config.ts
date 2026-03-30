import { z } from "zod";

export const SUBSCRIPTION_TYPE_IDS = [
  "temperature",
  "humidity",
  "noiseLevel",
  "updateAvailable",
  "systemBoot",
  "login",
  "register",
  "passwordChange",
  "roleChange",
  "accessCode",
  "outdoorGeofenceCrossed",
  "infrastructureStatusTooLong",
] as const;

export const SubscriptionTypeSchema = z.enum(SUBSCRIPTION_TYPE_IDS);
export const DetailLevelSchema = z.enum(["none", "title", "full"]);
export const DeliveryMethodSchema = z.enum(["email", "push"]);
export const NumericThresholdFieldSchema = z.enum(["value", "percentage", "db"]);
export const InfrastructureStatusSchema = z.enum(["open", "closed"]);
export const DeviceFingerprintSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/:/g, "").toLowerCase())
  .refine((value) => /^[0-9a-f]{64}$/.test(value), {
    message: "Invalid fingerprint format.",
  });

export const DEVICE_SCOPED_SUBSCRIPTION_TYPE_IDS = [
  "temperature",
  "humidity",
  "noiseLevel",
  "outdoorGeofenceCrossed",
  "infrastructureStatusTooLong",
] as const;

export const DeviceScopedSubscriptionTypeSchema = z.enum(
  DEVICE_SCOPED_SUBSCRIPTION_TYPE_IDS,
);

export type SubscriptionType = z.infer<typeof SubscriptionTypeSchema>;
export type DeviceScopedSubscriptionType = z.infer<
  typeof DeviceScopedSubscriptionTypeSchema
>;
export type DetailLevel = z.infer<typeof DetailLevelSchema>;
export type DeliveryMethod = z.infer<typeof DeliveryMethodSchema>;
export type NumericThresholdField = z.infer<typeof NumericThresholdFieldSchema>;
export type InfrastructureStatus = z.infer<typeof InfrastructureStatusSchema>;
export type EventGroup =
  | "Environment"
  | "Location"
  | "System"
  | "User activity";

export type LocationBeaconDraft = {
  displayName: string;
  macIdentifier: string;
};

export type PatientDraft = {
  surname: string;
  lastname: string;
  birthday: string;
};

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

const TemperatureThresholdConfigSchema = NumericThresholdConfigBaseSchema.extend({
  field: z.literal("value"),
}).refine(
  (value) => value.min < value.max,
  "Min must be smaller than max.",
);

const HumidityThresholdConfigSchema = NumericThresholdConfigBaseSchema.extend({
  field: z.literal("percentage"),
}).refine(
  (value) => value.min < value.max,
  "Min must be smaller than max.",
);

const NoiseLevelThresholdConfigSchema = NumericThresholdConfigBaseSchema.extend({
  field: z.literal("db"),
}).refine(
  (value) => value.min < value.max,
  "Min must be smaller than max.",
);

const StateGeofenceThresholdConfigSchema = z
  .object({
    category: z.literal("stateGeoRadius"),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    radiusMeters: z.number().gt(10, "Radius must be greater than 10 meters."),
  })
  .strict();

const StateDurationThresholdConfigSchema = z
  .object({
    category: z.literal("stateDuration"),
    status: InfrastructureStatusSchema,
    durationSeconds: z.number().positive(),
  })
  .strict();

export type NumericThresholdConfig = z.infer<typeof NumericThresholdConfigSchema>;
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

export type NumericThresholdDraft = {
  min: string;
  max: string;
};

export type OutdoorLocationThresholdDraft = {
  lat: string;
  lng: string;
  radiusMeters: string;
};

export type StateDurationThresholdDraft = {
  status: InfrastructureStatus;
  durationSeconds: string;
};

export type ThresholdUiConfig =
  | { category: "none" }
  | {
      category: "eventNumeric";
      field: NumericThresholdField;
      unit: string;
      sliderMin: number;
      sliderMax: number;
      step: number;
    }
  | { category: "stateGeoRadius" }
  | { category: "stateDuration" };

export type SubscriptionTypeOption = {
  id: SubscriptionType;
  label: string;
  group: EventGroup;
  threshold: ThresholdUiConfig;
};

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
export type DetailLevelsByType = Record<SubscriptionType, DetailLevel>;
export type DeliveryMethodsByType = Record<SubscriptionType, DeliveryMethod>;
export type DeviceSelectionsByType = Record<SubscriptionType, string | null>;
export type NumericThresholdsByType = Partial<
  Record<SubscriptionType, NumericThresholdDraft>
>;
export type GeoRadiusThresholdsByType = Partial<
  Record<SubscriptionType, OutdoorLocationThresholdDraft>
>;
export type StateDurationThresholdsByType = Partial<
  Record<SubscriptionType, StateDurationThresholdDraft>
>;
export type SubscriptionsByType = Partial<Record<SubscriptionType, Subscription[]>>;

const CreateSubscriptionInputSchema = z
  .object({
    type: SubscriptionTypeSchema,
    deviceFingerprint: DeviceFingerprintSchema.optional().nullable().default(null),
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

export const SubscriptionSchema = StoredSubscriptionInputSchema.transform((
  value,
  transformContext,
) => {
  const thresholdConfigResult = getThresholdConfigSchema(value.type).safeParse(
    value.thresholdConfig ?? null,
  );

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
});

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

    const thresholdConfigResult = getThresholdConfigSchema(value.type).safeParse(
      value.thresholdConfig ?? null,
    );

    if (!thresholdConfigResult.success) {
      const message =
        value.type === "outdoorGeofenceCrossed"
          ? "Geofence requires latitude, longitude, and radius."
          : value.type === "infrastructureStatusTooLong"
            ? "Infrastructure requires a status and duration."
            : thresholdConfigResult.error.issues[0]?.message ??
              "Invalid threshold config.";

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

export const DeviceSummarySchema = z.object({
  certFingerprintSha256: DeviceFingerprintSchema,
  name: z.string().nullable(),
});

export const DevicesResponseSchema = z.object({
  devices: z.array(DeviceSummarySchema),
});

const MacIdentifierSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/-/g, ":").toUpperCase())
  .refine((value) => /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(value), {
    message: "MAC identifier must be in the format AA:BB:CC:DD:EE:FF.",
  });

const PatientInputSchema = z.object({
  surname: z
    .string()
    .trim()
    .min(1, "Surname is required.")
    .max(255, "Surname cannot be longer than 255 characters."),
  lastname: z
    .string()
    .trim()
    .min(1, "Lastname is required.")
    .max(255, "Lastname cannot be longer than 255 characters."),
  birthday: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Birthday must be in YYYY-MM-DD format."),
}).strict();

export const PatientSchema = PatientInputSchema.extend({
  id: z.number().int().positive(),
});

export const CreatePatientSchema = PatientInputSchema;
export const UpdatePatientSchema = PatientInputSchema;

export const PatientResponseSchema = z.object({
  patient: PatientSchema.nullable(),
});

export const LocationBeaconSchema = z.object({
  id: z.number().int().positive(),
  createdAt: z.coerce.date(),
  displayName: z.string(),
  macIdentifier: MacIdentifierSchema,
});

export const CreateLocationBeaconSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required.")
    .max(255, "Display name cannot be longer than 255 characters."),
  macIdentifier: MacIdentifierSchema,
});

export const LocationBeaconsResponseSchema = z.object({
  beacons: z.array(LocationBeaconSchema),
});

export const LocationBeaconResponseSchema = z.object({
  beacon: LocationBeaconSchema,
});

export const LocationBeaconIdSchema = z.number().int().positive();

export type LocationBeacon = z.infer<typeof LocationBeaconSchema>;
export type CreateLocationBeacon = z.infer<typeof CreateLocationBeaconSchema>;
export type Patient = z.infer<typeof PatientSchema>;
export type CreatePatient = z.infer<typeof CreatePatientSchema>;
export type UpdatePatient = z.infer<typeof UpdatePatientSchema>;
export type DeviceSummary = z.infer<typeof DeviceSummarySchema>;

export function createEmptyLocationBeaconDraft(): LocationBeaconDraft {
  return {
    displayName: "",
    macIdentifier: "",
  };
}

export function createEmptyPatientDraft(): PatientDraft {
  return {
    surname: "",
    lastname: "",
    birthday: "",
  };
}

export const EVENT_GROUPS: EventGroup[] = [
  "Environment",
  "Location",
  "System",
  "User activity",
];

export const SETTINGS_PAGE_SECTION_IDS = {
  notifications: "notifications",
  locationBeacons: "location-beacons",
  userRoles: "user-roles",
  accessCodes: "access-codes",
  patientInformation: "patient-information",
} as const;

export const SUBSCRIPTION_TYPES: SubscriptionTypeOption[] = [
  {
    id: "temperature",
    label: "Temperature",
    group: "Environment",
    threshold: {
      category: "eventNumeric",
      field: "value",
      unit: "C",
      sliderMin: -20,
      sliderMax: 50,
      step: 0.5,
    },
  },
  {
    id: "humidity",
    label: "Humidity",
    group: "Environment",
    threshold: {
      category: "eventNumeric",
      field: "percentage",
      unit: "%",
      sliderMin: 0,
      sliderMax: 100,
      step: 1,
    },
  },
  {
    id: "noiseLevel",
    label: "Noise level",
    group: "Environment",
    threshold: {
      category: "eventNumeric",
      field: "db",
      unit: "dB",
      sliderMin: 0,
      sliderMax: 120,
      step: 1,
    },
  },
  {
    id: "outdoorGeofenceCrossed",
    label: "Outdoor geofence crossed",
    group: "Location",
    threshold: { category: "stateGeoRadius" },
  },
  {
    id: "infrastructureStatusTooLong",
    label: "Infrastructure",
    group: "System",
    threshold: { category: "stateDuration" },
  },
  {
    id: "updateAvailable",
    label: "Update available",
    group: "System",
    threshold: { category: "none" },
  },
  {
    id: "systemBoot",
    label: "System boot",
    group: "System",
    threshold: { category: "none" },
  },
  {
    id: "login",
    label: "Login",
    group: "User activity",
    threshold: { category: "none" },
  },
  {
    id: "register",
    label: "Register",
    group: "User activity",
    threshold: { category: "none" },
  },
  {
    id: "passwordChange",
    label: "Password change",
    group: "User activity",
    threshold: { category: "none" },
  },
  {
    id: "roleChange",
    label: "Role change",
    group: "User activity",
    threshold: { category: "none" },
  },
  {
    id: "accessCode",
    label: "Access code",
    group: "User activity",
    threshold: { category: "none" },
  },
];

export const DETAIL_LEVEL_OPTIONS: Array<{ value: DetailLevel; label: string }> =
  [
    { value: "none", label: "Generic alert" },
    { value: "title", label: "Title only" },
    { value: "full", label: "Full details" },
  ];

export const DELIVERY_METHOD_OPTIONS: Array<{
  value: DeliveryMethod;
  label: string;
}> = [
  { value: "email", label: "Email" },
  { value: "push", label: "Push" },
];

export function getSubscriptionTypeOption(
  type: SubscriptionType,
): SubscriptionTypeOption {
  const option = SUBSCRIPTION_TYPES.find(
    (currentOption) => currentOption.id === type,
  );

  if (!option) {
    throw new Error(`Unknown subscription type: ${type}`);
  }

  return option;
}

export function getSubscriptionTypesForGroup(
  group: EventGroup,
): SubscriptionTypeOption[] {
  return SUBSCRIPTION_TYPES.filter((type) => type.group === group);
}

export function createEmptyNumericThresholdDraft(): NumericThresholdDraft {
  return { min: "", max: "" };
}

export function createEmptyOutdoorLocationThresholdDraft(): OutdoorLocationThresholdDraft {
  return { lat: "", lng: "", radiusMeters: "" };
}

export function createEmptyStateDurationThresholdDraft(): StateDurationThresholdDraft {
  return {
    status: "open",
    durationSeconds: "",
  };
}

export function createInitialDetailLevels(): Record<SubscriptionType, DetailLevel> {
  const initialValues = {} as DetailLevelsByType;

  for (const type of SUBSCRIPTION_TYPES) {
    initialValues[type.id] = "none";
  }

  return initialValues;
}

export function createInitialDeliveryMethods(): Record<SubscriptionType, DeliveryMethod> {
  const initialValues = {} as DeliveryMethodsByType;

  for (const type of SUBSCRIPTION_TYPES) {
    initialValues[type.id] = "email";
  }

  return initialValues;
}

export function createInitialDeviceSelections(): Record<SubscriptionType, string | null> {
  const initialValues = {} as DeviceSelectionsByType;

  for (const type of SUBSCRIPTION_TYPES) {
    initialValues[type.id] = null;
  }

  return initialValues;
}

export function createInitialNumericThresholds(): Partial<
  Record<SubscriptionType, NumericThresholdDraft>
> {
  const initialValues: NumericThresholdsByType = {};

  for (const type of SUBSCRIPTION_TYPES) {
    if (type.threshold.category === "eventNumeric") {
      initialValues[type.id] = createEmptyNumericThresholdDraft();
    }
  }

  return initialValues;
}

export function createInitialOutdoorLocationThresholds(): Partial<
  Record<SubscriptionType, OutdoorLocationThresholdDraft>
> {
  const initialValues: GeoRadiusThresholdsByType = {};

  for (const type of SUBSCRIPTION_TYPES) {
    if (type.threshold.category === "stateGeoRadius") {
      initialValues[type.id] = createEmptyOutdoorLocationThresholdDraft();
    }
  }

  return initialValues;
}

export function createInitialStateDurationThresholds(): Partial<
  Record<SubscriptionType, StateDurationThresholdDraft>
> {
  const initialValues: StateDurationThresholdsByType = {};

  for (const type of SUBSCRIPTION_TYPES) {
    if (type.threshold.category === "stateDuration") {
      initialValues[type.id] = createEmptyStateDurationThresholdDraft();
    }
  }

  return initialValues;
}

export function getThresholdConfigSchema(type: SubscriptionType) {
  if (type === "infrastructureStatusTooLong") {
    return StateDurationThresholdConfigSchema;
  }

  const subscriptionTypeOption = getSubscriptionTypeOption(type);

  if (subscriptionTypeOption.threshold.category === "eventNumeric") {
    switch (subscriptionTypeOption.threshold.field) {
      case "value":
        return TemperatureThresholdConfigSchema.nullable();
      case "percentage":
        return HumidityThresholdConfigSchema.nullable();
      case "db":
        return NoiseLevelThresholdConfigSchema.nullable();
    }
  }

  if (subscriptionTypeOption.threshold.category === "stateGeoRadius") {
    return StateGeofenceThresholdConfigSchema;
  }

  return z.null();
}

export function groupSubscriptionsByType(
  subscriptions: Subscription[],
): SubscriptionsByType {
  const subscriptionsByType: SubscriptionsByType = {};

  for (const subscription of subscriptions) {
    const subscriptionsForType =
      subscriptionsByType[subscription.type] ?? [];

    subscriptionsForType.push(subscription);
    subscriptionsByType[subscription.type] = subscriptionsForType;
  }

  return subscriptionsByType;
}

export function getSelectedDetailLevel(
  detailLevelsByType: DetailLevelsByType,
  type: SubscriptionType,
): DetailLevel {
  return detailLevelsByType[type] ?? "none";
}

export function getSelectedDeliveryMethod(
  deliveryMethodsByType: DeliveryMethodsByType,
  type: SubscriptionType,
): DeliveryMethod {
  return deliveryMethodsByType[type] ?? "email";
}

export function getSelectedDeviceFingerprint(
  deviceSelectionsByType: DeviceSelectionsByType,
  type: SubscriptionType,
): string | null {
  return deviceSelectionsByType[type] ?? null;
}

export function getNumericThresholdDraft(
  numericThresholdsByType: NumericThresholdsByType,
  type: SubscriptionType,
): NumericThresholdDraft {
  return (
    numericThresholdsByType[type] ?? createEmptyNumericThresholdDraft()
  );
}

export function getOutdoorLocationThresholdDraft(
  geoRadiusThresholdsByType: GeoRadiusThresholdsByType,
  type: SubscriptionType,
): OutdoorLocationThresholdDraft {
  return (
    geoRadiusThresholdsByType[type] ??
    createEmptyOutdoorLocationThresholdDraft()
  );
}

export function getStateDurationThresholdDraft(
  stateDurationThresholdsByType: StateDurationThresholdsByType,
  type: SubscriptionType,
): StateDurationThresholdDraft {
  return (
    stateDurationThresholdsByType[type] ??
    createEmptyStateDurationThresholdDraft()
  );
}

export function hasSelectedSubscription(
  subscriptions: Subscription[],
  detailLevel: DetailLevel,
  deliveryMethod: DeliveryMethod,
  deviceFingerprint: string | null,
): boolean {
  return subscriptions.some(
    (subscription) =>
      subscription.detailLevel === detailLevel &&
      subscription.deliveryMethod === deliveryMethod &&
      (subscription.deviceCertFingerprintSha256 ?? null) === deviceFingerprint,
  );
}

export function buildThresholdConfig(
  type: SubscriptionType,
  numericThresholdsByType: NumericThresholdsByType,
  geoRadiusThresholdsByType: GeoRadiusThresholdsByType,
  stateDurationThresholdsByType: StateDurationThresholdsByType,
): unknown {
  const subscriptionTypeOption = getSubscriptionTypeOption(type);

  if (subscriptionTypeOption.threshold.category === "none") {
    return null;
  }

  if (subscriptionTypeOption.threshold.category === "eventNumeric") {
    const thresholdDraft = getNumericThresholdDraft(
      numericThresholdsByType,
      type,
    );
    const min = parseOptionalNumber(thresholdDraft.min);
    const max = parseOptionalNumber(thresholdDraft.max);

    if (min === undefined && max === undefined) {
      return null;
    }

    if (min === undefined || max === undefined) {
      return null;
    }

    return {
      category: "eventNumeric",
      field: subscriptionTypeOption.threshold.field,
      min,
      max,
    };
  }

  if (subscriptionTypeOption.threshold.category === "stateDuration") {
    const thresholdDraft = getStateDurationThresholdDraft(
      stateDurationThresholdsByType,
      type,
    );
    const durationSeconds = parseOptionalNumber(thresholdDraft.durationSeconds);

    if (durationSeconds === undefined) {
      return null;
    }

    return {
      category: "stateDuration",
      status: thresholdDraft.status,
      durationSeconds,
    };
  }

  const thresholdDraft = getOutdoorLocationThresholdDraft(
    geoRadiusThresholdsByType,
    type,
  );

  if (
    !thresholdDraft.lat.trim() &&
    !thresholdDraft.lng.trim() &&
    !thresholdDraft.radiusMeters.trim()
  ) {
    return null;
  }

  return {
    category: "stateGeoRadius",
    lat: parseOptionalNumber(thresholdDraft.lat),
    lng: parseOptionalNumber(thresholdDraft.lng),
    radiusMeters: parseOptionalNumber(thresholdDraft.radiusMeters),
  };
}

export function getDetailLevelLabel(detailLevel: DetailLevel): string {
  const option = DETAIL_LEVEL_OPTIONS.find(
    (currentOption) => currentOption.value === detailLevel,
  );

  return option?.label ?? detailLevel;
}

export function getDeliveryMethodLabel(deliveryMethod: DeliveryMethod): string {
  const option = DELIVERY_METHOD_OPTIONS.find(
    (currentOption) => currentOption.value === deliveryMethod,
  );

  return option?.label ?? deliveryMethod;
}

export function supportsDeviceSelection(
  type: SubscriptionType,
): type is DeviceScopedSubscriptionType {
  return DEVICE_SCOPED_SUBSCRIPTION_TYPE_IDS.includes(
    type as DeviceScopedSubscriptionType,
  );
}

export function formatThresholdConfig(
  thresholdConfig: ThresholdConfig,
  type: SubscriptionType,
): string | null {
  if (!thresholdConfig) {
    return null;
  }

  if (thresholdConfig.category === "eventNumeric") {
    const subscriptionTypeOption = getSubscriptionTypeOption(type);
    const unit = subscriptionTypeOption.threshold.category === "eventNumeric"
      ? subscriptionTypeOption.threshold.unit
      : "";
    return `Outside ${thresholdConfig.min}-${thresholdConfig.max} ${unit}`.trim();
  }

  if (thresholdConfig.category === "stateGeoRadius") {
    return `Crosses ${thresholdConfig.radiusMeters} m around ${thresholdConfig.lat}, ${thresholdConfig.lng}`;
  }

  if (thresholdConfig.category === "stateDuration") {
    return `${thresholdConfig.status} for more than ${thresholdConfig.durationSeconds} s`;
  }

  return null;
}

export function parseOptionalNumber(value: string): number | undefined {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return undefined;
  }

  return Number(trimmedValue);
}

export function getNumericSliderValue(
  type: SubscriptionType,
  thresholdDraft: NumericThresholdDraft,
): [number, number] {
  const subscriptionTypeOption = getSubscriptionTypeOption(type);

  if (subscriptionTypeOption.threshold.category !== "eventNumeric") {
    throw new Error(`Subscription type ${type} does not support numeric thresholds.`);
  }

  const min = parseOptionalNumber(thresholdDraft.min);
  const max = parseOptionalNumber(thresholdDraft.max);

  if (min === undefined || max === undefined) {
    return [
      subscriptionTypeOption.threshold.sliderMin,
      subscriptionTypeOption.threshold.sliderMax,
    ];
  }

  return [min, max];
}
