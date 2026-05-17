import { useQueries, useQuery } from "@tanstack/react-query";

import { axiosInstance, endpoints, type ApiDevice } from "@/lib/api";

const STALE_TIME = 5_000;

async function getDevice(fingerprint: string) {
  const response = await axiosInstance.get<ApiDevice>(
    endpoints.device.get(fingerprint),
  );
  return response.data;
}

export function useDeviceDisplayName(fingerprint: string) {
  const { data } = useQuery({
    queryKey: ["device", fingerprint],
    staleTime: STALE_TIME,
    queryFn: () => getDevice(fingerprint),
  });

  return data?.name?.trim() || "Unnamed device";
}

export function useDeviceDisplayNames(fingerprints: string[]) {
  const queries = useQueries({
    queries: fingerprints.map((fingerprint) => ({
      queryKey: ["device", fingerprint],
      queryFn: () => getDevice(fingerprint),
      staleTime: STALE_TIME,
    })),
  });

  return new Map(
    fingerprints.map((fingerprint, index) => [
      fingerprint,
      queries[index].data
        ? queries[index].data.name?.trim() || "Unnamed device"
        : "Unnamed device",
    ]),
  );
}
