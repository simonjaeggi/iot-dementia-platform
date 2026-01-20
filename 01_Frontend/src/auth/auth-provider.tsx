import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "@/lib/api";
import type { User } from "./types";
import { AuthContext } from "./auth-context";
import { toast } from "sonner";
import axios from "axios";

type ApiErrorResponse = { message?: string };

async function fetchMe(): Promise<User | null> {
  try {
    const res = await axiosInstance.get<User>("/auth/me");
    return res.data;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();

  const me = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (vars: { email: string; password: string }) => {
      await axiosInstance.post("/auth/login", vars);
    },
    onSuccess: async () => {
      toast.success("Login successful");
      await qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (error: unknown) => {
      const msg = getAxiosErrorMessage(error, "Login failed.");
      toast.error(msg);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (vars: {
      email: string;
      password: string;
      accessCode: string;
      name: string;
    }) => {
      await axiosInstance.post("/auth/register", vars);
    },
    onSuccess: async () => {
      toast.success("Registration successful");
      await qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (error: unknown) => {
      const msg = getAxiosErrorMessage(error, "Registration failed.");
      toast.error(msg);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await axiosInstance.post("/auth/logout");
    },
    onSuccess: async () => {
      toast.success("Logout successful");
      qc.setQueryData(["me"], null);
      await qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (error: unknown) => {
      const msg = getAxiosErrorMessage(error, "Logout failed.");
      toast.error(msg);
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: me.data ?? null,
        isLoading: me.isLoading,
        login: (email, password) =>
          loginMutation.mutateAsync({ email, password }),
        register: (email, password, accessCode, name) =>
          registerMutation.mutateAsync({ email, password, accessCode, name }),
        logout: () => logoutMutation.mutateAsync(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function getAxiosErrorMessage(error: unknown, fallback: string) {
  return axios.isAxiosError<ApiErrorResponse>(error)
    ? error.response?.data?.message || error.message || fallback
    : error instanceof Error
      ? error.message
      : fallback;
}
