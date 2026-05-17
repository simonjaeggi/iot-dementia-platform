import { Navigate, useLocation } from "react-router-dom";
import { useContext, useEffect } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { AuthContext } from "./auth-context";
import { Spinner } from "@/components/ui/spinner";
import type { UserRole } from "@/lib/api";

type RequireAuthProps = {
  children: ReactNode;
  requiredRole?: UserRole | null;
  redirectTo?: string;
};

export function RequireAuth({
  children,
  requiredRole = null,
  redirectTo = "/login",
}: RequireAuthProps) {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("RequireAuth must be used within AuthProvider");
  const { user, isLoading } = ctx;
  const location = useLocation();
  const isUnauthorized = Boolean(
    user && requiredRole && requiredRole !== user.role,
  );

  useEffect(() => {
    if (!isUnauthorized) return;

    toast.error("You do not have permission to access this page.", {
      id: "unauthorized-route",
    });
  }, [isUnauthorized]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-6">
        <Spinner className="h-10 w-10 text-primary" />
      </div>
    );
  }

  if (!user)
    return <Navigate to={redirectTo} replace state={{ from: location }} />;

  if (isUnauthorized) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
