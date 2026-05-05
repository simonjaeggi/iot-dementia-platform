import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: "/",
  timeout: 10000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

type ApiErrorResponse = { message?: string };

export function getAxiosErrorMessage(error: unknown, fallback: string) {
  return axios.isAxiosError<ApiErrorResponse>(error)
    ? error.response?.data?.message || error.message || fallback
    : error instanceof Error
      ? error.message
      : fallback;
}
