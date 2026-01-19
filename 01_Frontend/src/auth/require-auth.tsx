import { Navigate, useLocation } from "react-router-dom"
import { useContext } from "react"
import { AuthContext } from "./auth-provider"
import type { JSX } from "react"

export function RequireAuth({ children }: { children: JSX.Element }) {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("RequireAuth must be used within AuthProvider")
  const { user, isLoading } = ctx
  const location = useLocation()

  if (isLoading) return <div className="p-6">Loading…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />

  return children
}
