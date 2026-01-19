import React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { axiosInstance } from "@/lib/api"
import type { User } from "./types"
import { AuthContext } from "./auth-context"

async function fetchMe(): Promise<User | null> {
  try {
    const res = await axiosInstance.get<User>("/auth/me")
    return res.data
  } catch {
    return null 
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient()

  const me = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    retry: false,
  })

  const login = useMutation({
    mutationFn: (vars: { email: string; password: string }) =>
      axiosInstance.post("/auth/login", vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  })

  const register = useMutation({
    mutationFn: (vars: { email: string; password: string; accessCode: string, name: string }) =>
      axiosInstance.post("/auth/register", vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  })

  const logout = useMutation({
    mutationFn: () => axiosInstance.post("/auth/logout"),
    onSuccess: () => {
      qc.setQueryData(["me"], null)
      qc.invalidateQueries({ queryKey: ["me"] })
    },
  })

  return (
    <AuthContext.Provider
      value={{
        user: me.data ?? null,
        isLoading: me.isLoading,
        login: (email, password) => login.mutateAsync({ email, password }).then(() => {}),
        register: (email, password, accessCode, name) =>
          register.mutateAsync({ email, password, accessCode, name }).then(() => {}),
        logout: () => logout.mutateAsync().then(() => {}),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
