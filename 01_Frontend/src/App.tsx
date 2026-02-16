import Dashboard from "./app/dashboard/dashboard";
import Devices from "./app/devices/devices";
import { Routes, Route, Navigate } from "react-router-dom";
import { LoginForm } from "./components/login-form";
import { RequireAuth } from "./auth/require-auth";
import { RegistrationForm } from "./components/registration-form";

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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
