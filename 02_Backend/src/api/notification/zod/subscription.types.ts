import { z } from "zod";

export const statelessSubscriptionTypeValues = [
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
] as const;

export const statefulSubscriptionTypeValues = [
  "outdoorGeofenceCrossed",
  "infrastructureStatusTooLong",
] as const;

export const deviceScopedSubscriptionTypeValues = [
  "temperature",
  "humidity",
  "noiseLevel",
  "outdoorGeofenceCrossed",
  "infrastructureStatusTooLong",
] as const;

export const StatelessSubscriptionTypeSchema = z.enum(
  statelessSubscriptionTypeValues,
);
export const StatefulSubscriptionTypeSchema = z.enum(
  statefulSubscriptionTypeValues,
);
export const DeviceScopedSubscriptionTypeSchema = z.enum(
  deviceScopedSubscriptionTypeValues,
);

export const subscriptionTypeValues = [
  ...statelessSubscriptionTypeValues,
  ...statefulSubscriptionTypeValues,
] as const;

export const SubscriptionTypeSchema = z.enum(subscriptionTypeValues);

export type StatelessSubscriptionType = z.infer<
  typeof StatelessSubscriptionTypeSchema
>;
export type StatefulSubscriptionType = z.infer<
  typeof StatefulSubscriptionTypeSchema
>;
export type DeviceScopedSubscriptionType = z.infer<
  typeof DeviceScopedSubscriptionTypeSchema
>;
export type SubscriptionType = z.infer<typeof SubscriptionTypeSchema>;

export function isStatelessSubscriptionType(
  value: string,
): value is StatelessSubscriptionType {
  return statelessSubscriptionTypeValues.includes(
    value as StatelessSubscriptionType,
  );
}

export function supportsDeviceScopedSubscriptions(
  value: SubscriptionType,
): value is DeviceScopedSubscriptionType {
  return deviceScopedSubscriptionTypeValues.includes(
    value as DeviceScopedSubscriptionType,
  );
}
