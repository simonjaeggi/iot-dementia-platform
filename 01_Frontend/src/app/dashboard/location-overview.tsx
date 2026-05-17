import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  axiosInstance,
  endpoints,
  type ApiEvent,
  type LocationBeacon,
} from "@/lib/api";
import {
  getBeaconNamesByMac,
  getOutdoorLocation,
  getRoomFromEvent,
  hasBeaconReading,
} from "@/lib/location-helpers";

type LatestLocation =
  | { kind: "indoor"; status: "Indoor"; value: string }
  | { kind: "outdoor"; status: "Outdoor"; value: string };

const LOOKBACK_SECONDS = 5 * 60;

export function LocationOverview() {
  const indoorQuery = useLocationEventQuery("indoorLocation");
  const outdoorQuery = useLocationEventQuery("outdoorLocation");
  const beaconsQuery = useQuery({
    queryKey: ["location-beacons"],
    queryFn: async () => {
      const response = await axiosInstance.get<{ beacons: LocationBeacon[] }>(
        endpoints.misc.locationBeacons,
      );
      return response.data.beacons;
    },
  });

  const beaconNamesByMac = useMemo(
    () => getBeaconNamesByMac(beaconsQuery.data ?? []),
    [beaconsQuery.data],
  );
  const latestLocation = getLatestLocation(
    indoorQuery.data ?? [],
    outdoorQuery.data ?? [],
    beaconNamesByMac,
  );

  const status =
    indoorQuery.isLoading || outdoorQuery.isLoading
      ? "Loading"
      : indoorQuery.isError || outdoorQuery.isError
        ? "Unavailable"
        : (latestLocation?.status ?? "Location Unknown");
  const value = latestLocation?.value ?? `No data in the last ${LOOKBACK_SECONDS} seconds.`;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-muted-foreground text-xs font-medium uppercase">
        Current location
      </div>
      <div className="text-foreground mt-2 text-3xl font-semibold tracking-normal">
        {status}
      </div>
      <div className="text-muted-foreground mt-2 text-sm break-all">
        {value}
      </div>
    </div>
  );
}

function useLocationEventQuery(
  eventType: "indoorLocation" | "outdoorLocation",
) {
  return useQuery({
    queryKey: ["events", eventType, LOOKBACK_SECONDS],
    queryFn: async () => {
      const response = await axiosInstance.get<ApiEvent[]>(
        endpoints.event.byTypeAndSeconds(LOOKBACK_SECONDS, eventType),
      );
      return response.data;
    },
  });
}

function getLatestLocation(
  indoorEvents: ApiEvent[],
  outdoorEvents: ApiEvent[],
  beaconNamesByMac: Map<string, string>,
): LatestLocation | null {
  const indoorReading = getIndoorReading(indoorEvents);
  const outdoorReading = getOutdoorReading(outdoorEvents);

  if (indoorReading) {
    const room = getRoomFromEvent(indoorReading, beaconNamesByMac);
    return { kind: "indoor", status: "Indoor", value: room ?? "Unknown room" };
  }

  if (outdoorReading) {
    const location = getOutdoorLocation(outdoorReading);
    return location
      ? {
          kind: "outdoor",
          status: "Outdoor",
          value: `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`,
        }
      : null;
  }

  return null;
}

function getIndoorReading(events: ApiEvent[]) {
  return events.find(hasBeaconReading) ?? null;
}

function getOutdoorReading(events: ApiEvent[]) {
  return events.find((event) => getOutdoorLocation(event) !== null) ?? null;
}
