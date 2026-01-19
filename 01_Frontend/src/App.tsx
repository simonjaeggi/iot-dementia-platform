import Dashboard from "./app/dashboard/dashboard";
import { Routes, Route, Navigate } from "react-router-dom";
import { LoginForm } from "./components/login-form";
import { RequireAuth } from "./auth/require-auth";
import { RegistrationForm } from "./components/registration-form";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      <Route path="/register" element={<RegistrationForm />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
