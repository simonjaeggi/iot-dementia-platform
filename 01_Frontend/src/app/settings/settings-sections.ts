import type { UserRole } from "@/lib/api";

type SettingsSection = {
  title: string;
  description: string;
  path: string;
  requiredRole?: UserRole;
};

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    title: "My Account",
    description: "View your account details.",
    path: "/settings/account",
  },
  {
    title: "Notification Subscriptions",
    description: "Choose which event types should create notifications.",
    path: "/settings/notifications",
  },
  {
    title: "Location Beacons",
    description: "Manage room labels for indoor location detection.",
    path: "/settings/location-beacons",
  },
  {
    title: "Users & Roles",
    description: "Manage users and their roles.",
    path: "/settings/users",
    requiredRole: "admin",
  },
  {
    title: "Access Codes",
    description: "Issue and revoke registration access codes.",
    path: "/settings/access-codes",
    requiredRole: "admin",
  },
  {
    title: "Patient Information",
    description: "Manage the information of the patient.",
    path: "/settings/patient",
  },
];

