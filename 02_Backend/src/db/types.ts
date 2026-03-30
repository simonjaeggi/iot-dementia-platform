import {
  devices,
  infrastructureStates,
  locationBeacons,
  patients,
  userEventSubscriptions,
  userNotificationTransport,
  userNotifications,
  users,
} from "./schema";

export type ExistingUser = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type NewDevice = typeof devices.$inferInsert;
export type ExistingDevice = typeof devices.$inferSelect;
export type NewLocationBeacon = typeof locationBeacons.$inferInsert;
export type ExistingLocationBeacon = typeof locationBeacons.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type ExistingPatient = typeof patients.$inferSelect;
export type NewInfrastructureState = typeof infrastructureStates.$inferInsert;
export type ExistingInfrastructureState = typeof infrastructureStates.$inferSelect;
export type StoredNotification = typeof userNotifications.$inferSelect;
export type StoredUserEventSubscription = typeof userEventSubscriptions.$inferSelect;
export type StoredNotificationTransport = typeof userNotificationTransport.$inferSelect
export type InfrastructureState = typeof infrastructureStates.$inferSelect
