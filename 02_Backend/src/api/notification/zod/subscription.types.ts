import { z } from "zod";

const statelessSubscriptionTypeValues = [
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
] as const;

const statefulSubscriptionTypeValues = [
  "outdoorGeofenceCrossed",
  "fallDetection",
  "panicDetection",
  "sameRoomTooLong",
  "infrastructureStatusTooLong",
] as const;

const deviceScopedSubscriptionTypeValues = [
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

export const StatelessSubscriptionTypeSchema = z.enum(
  statelessSubscriptionTypeValues,
);
export const StatefulSubscriptionTypeSchema = z.enum(
  statefulSubscriptionTypeValues,
);
export const DeviceScopedSubscriptionTypeSchema = z.enum(
  deviceScopedSubscriptionTypeValues,
);

const subscriptionTypeValues = [
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

/**
 * Checks if a given type is a stateless subscription type. 
 * @param value type to check
 * @returns True if it is a known stateless subscription type, False otherwise.
 */
export function isStatelessSubscriptionType(
  value: string,
): boolean {
  return statelessSubscriptionTypeValues.includes(
    value as StatelessSubscriptionType,
  );
}

/**
 * Checks if a given type is a subscription type thats supports device scoped subscriptions. 
 * @param value type to check
 * @returns True if it is a known subscription type and supports device scoping, False otherwise.
 */
export function supportsDeviceScopedSubscriptions(
  value: SubscriptionType,
): boolean {
  return deviceScopedSubscriptionTypeValues.includes(
    value as DeviceScopedSubscriptionType,
  );
}
