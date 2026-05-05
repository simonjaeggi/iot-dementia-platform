import Dashboard from "./app/dashboard/dashboard";
import Devices from "./app/devices/devices";
import Events from "./app/events/events";
import NotificationInbox from "./app/notification-inbox/notification-inbox";
import { SettingsOverview } from "./app/settings/settings-overview";
import { Notifications } from "./app/settings/notifications/notifications";
import { LocationBeacons } from "./app/settings/location-beacons/location-beacons";
import { UserRoles } from "./app/settings/user-roles/user-roles";
import { AccessCodes } from "./app/settings/access-codes/access-codes";
import { Patient } from "./app/settings/patient/patient";
import { Routes, Route, Navigate } from "react-router-dom";
import { LoginForm } from "./app/auth/login-form";
import { RequireAuth } from "./auth/require-auth";
import { RegistrationForm } from "./app/auth/registration-form";

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md">
              <LoginForm />
            </div>
          </div>
        }
      />
      <Route
        path="/register"
        element={
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md">
              <RegistrationForm />
            </div>
          </div>
        }
      />

      <Route
        path="/"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/devices"
        element={
          <RequireAuth>
            <Devices />
          </RequireAuth>
        }
      />
      <Route
        path="/events"
        element={
          <RequireAuth>
            <Events />
          </RequireAuth>
        }
      />
      <Route
        path="/notifications"
        element={
          <RequireAuth>
            <NotificationInbox />
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <SettingsOverview />
          </RequireAuth>
        }
      />
      <Route
        path="/settings/notifications"
        element={
          <RequireAuth>
            <Notifications />
          </RequireAuth>
        }
      />
      <Route
        path="/settings/location-beacons"
        element={
          <RequireAuth>
            <LocationBeacons />
          </RequireAuth>
        }
      />
      <Route
        path="/settings/users"
        element={
          <RequireAuth>
            <UserRoles />
          </RequireAuth>
        }
      />
      <Route
        path="/settings/access-codes"
        element={
          <RequireAuth>
            <AccessCodes />
          </RequireAuth>
        }
      />
      <Route
        path="/settings/patient"
        element={
          <RequireAuth>
            <Patient />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
