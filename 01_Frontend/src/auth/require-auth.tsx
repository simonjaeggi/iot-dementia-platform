import { Navigate, useLocation } from "react-router-dom";
import { useContext } from "react";
import type { JSX } from "react";
import { AuthContext } from "./auth-context";
import { Spinner } from "@/components/ui/spinner";


export function RequireAuth({ children }: { children: JSX.Element }) {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("RequireAuth must be used within AuthProvider");
  const { user, isLoading } = ctx;
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-6">
        <Spinner className="h-10 w-10 text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  return children;
}
