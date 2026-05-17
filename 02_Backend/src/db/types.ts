import {
  accessCodes,
  devices,
  events,
  fallDetectionStates,
  indoorLocationStates,
  infrastructureStates,
  locationBeacons,
  outdoorLocationStates,
  patients,
  softwareVersions,
  userEventSubscriptions,
  userNotificationTransport,
  userNotifications,
  users,
} from "./schema";

export type ExistingEvent = typeof events.$inferSelect;
export type ExistingUser = typeof users.$inferSelect;
export type ExistingAccessCode = typeof accessCodes.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type NewDevice = typeof devices.$inferInsert;
export type ExistingDevice = typeof devices.$inferSelect;
export type NewLocationBeacon = typeof locationBeacons.$inferInsert;
export type ExistingLocationBeacon = typeof locationBeacons.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type ExistingPatient = typeof patients.$inferSelect;
export type StoredSoftwareVersion = typeof softwareVersions.$inferSelect;
export type NewInfrastructureState = typeof infrastructureStates.$inferInsert;
export type ExistingInfrastructureState = typeof infrastructureStates.$inferSelect;
export type NewIndoorLocationState = typeof indoorLocationStates.$inferInsert;
export type ExistingIndoorLocationState = typeof indoorLocationStates.$inferSelect;
export type NewOutdoorLocationState = typeof outdoorLocationStates.$inferInsert;
export type ExistingOutdoorLocationState = typeof outdoorLocationStates.$inferSelect;
export type NewFallDetectionState = typeof fallDetectionStates.$inferInsert;
export type ExistingFallDetectionState = typeof fallDetectionStates.$inferSelect;
export type ExistingNotification = typeof userNotifications.$inferSelect;
export type ExistingUserEventSubscription = typeof userEventSubscriptions.$inferSelect;
export type ExistingNotificationTransport = typeof userNotificationTransport.$inferSelect
