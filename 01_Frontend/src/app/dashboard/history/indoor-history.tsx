import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  axiosInstance,
  endpoints,
  type ApiEvent,
  type LocationBeacon,
} from "@/lib/api";
import { getBeaconNamesByMac, getRoomFromEvent } from "@/lib/location-helpers";
import { formatDate, formatTime } from "@/lib/detail-formatters";

type RoomRange = {
  room: string;
  start: Date;
  end: Date;
};

const LOOKBACK_DAYS = 1;

export function IndoorHistory() {
  const indoorQuery = useQuery({
    queryKey: ["events", "indoorLocation", LOOKBACK_DAYS],
    queryFn: async () => {
      const response = await axiosInstance.get<ApiEvent[]>(
        endpoints.event.byTypeAndDays(LOOKBACK_DAYS, "indoorLocation"),
      );
      return response.data;
    },
  });
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
  const ranges = useMemo(
    () => buildRoomRanges(indoorQuery.data ?? [], beaconNamesByMac),
    [beaconNamesByMac, indoorQuery.data],
  );
  const timelineStart = ranges[0]?.start;

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <div className="leading-none font-semibold">Indoor location</div>
        <div className="text-muted-foreground text-sm">
          Room history over the last 24 hours.
        </div>
      </div>

      {indoorQuery.isLoading || beaconsQuery.isLoading ? (
        <div className="text-muted-foreground flex h-[320px] items-center justify-center gap-2 text-sm">
          <Spinner />
          Loading indoor locations...
        </div>
      ) : indoorQuery.isError ? (
        <div className="text-destructive text-sm">
          Failed to load indoor locations.
        </div>
      ) : ranges.length === 0 ? (
        <div className="text-muted-foreground text-sm">
          No indoor location readings found.
        </div>
      ) : (
        <div className="relative space-y-1 before:absolute before:top-3 before:bottom-3 before:left-2 before:w-px before:bg-border">
          {timelineStart ? (
            <div className="relative flex items-center py-2 pl-8">
              <div
                aria-hidden="true"
                className="absolute left-1 z-10 size-2 rounded-full bg-muted-foreground"
              />
              <div className="text-muted-foreground font-mono text-xs">
                {formatDate(timelineStart.toISOString(), {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          ) : null}
          {ranges.map((range, index) => (
            <div
              key={`${range.room}-${range.start.toISOString()}-${index}`}
              className="relative grid gap-3 py-3 pl-8 sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div
                aria-hidden="true"
                className="absolute top-4 left-0 z-10 size-4 rounded-full border-2 border-background bg-primary shadow-sm ring-2 ring-primary/25"
              />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{range.room}</div>
                <div className="text-muted-foreground mt-1 font-mono text-xs">
                  {formatTime(range.start)} - {formatTime(range.end)}
                </div>
              </div>
              <Badge variant="secondary" className="self-start">
                {formatDuration(range.start, range.end)}
              </Badge>
            </div>
          ))}
          <div className="relative flex items-center py-2 pl-8">
            <div
              aria-hidden="true"
              className="absolute left-1 z-10 size-2 rounded-full bg-muted-foreground"
            />
            <div className="text-muted-foreground font-mono text-xs">Now</div>
          </div>
        </div>
      )}
    </div>
  );
}

function buildRoomRanges(
  events: ApiEvent[],
  beaconNamesByMac: Map<string, string>,
) {
  const points = events
    .map((event) => {
      const time = new Date(event.time);
      const room = getRoomFromEvent(event, beaconNamesByMac);
      if (!room || Number.isNaN(time.getTime())) return null;
      return { time, room };
    })
    .filter((p): p is { time: Date; room: string } => p !== null)
    .sort((a, b) => a.time.getTime() - b.time.getTime());

  const ranges: RoomRange[] = [];
  for (const [index, point] of points.entries()) {
    const end = points[index + 1]?.time ?? new Date();
    const previous = ranges[ranges.length - 1];

    if (previous?.room === point.room) {
      previous.end = end;
      continue;
    }
    ranges.push({ room: point.room, start: point.time, end });
  }
  return ranges;
}


function formatDuration(start: Date, end: Date) {
  const totalMin = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 60_000),
  );
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}
