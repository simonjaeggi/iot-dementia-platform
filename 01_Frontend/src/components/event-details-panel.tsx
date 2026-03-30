import type { ReactNode } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { axiosInstance, getAxiosErrorMessage } from "@/lib/api";
import {
  formatDateTime,
  formatEventType,
  formatJson,
  formatLabel,
  formatPrimitiveValue,
} from "@/lib/detail-formatters";

type DeviceEventSource = {
  kind: "device";
  deviceFingerprint: string;
  bootId: number;
  uptimeMs: number;
};

type BackendEventSource = {
  kind: "backend";
  service: string;
};

type UserEventSource = {
  kind: "user";
  userId: string;
  userEmail: string;
};

type ApiEventSource = DeviceEventSource | BackendEventSource | UserEventSource;

type ApiEvent = {
  id: number;
  type: string;
  time: string;
  source: ApiEventSource;
  data?: unknown;
};

type ApiDevice = {
  name: string | null;
};

type ApiIndoorBeacon = {
  id: string;
  signalStrengthDbm: number;
};

type ApiLocationBeacon = {
  displayName: string;
  macIdentifier: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIndoorBeacon(value: unknown): value is ApiIndoorBeacon {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.signalStrengthDbm === "number"
  );
}

function normaliseMacIdentifier(value: string) {
  return value.trim().replace(/-/g, ":").toUpperCase();
}

function renderIndoorBeacon(
  beacon: ApiIndoorBeacon,
  beaconDisplayName: string | null,
) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      <div className="max-w-full min-w-[9rem] grow basis-auto py-1">
        <div className="text-muted-foreground text-xs">Beacon</div>
        <div className="mt-1 text-sm font-medium break-words">
          {beaconDisplayName ?? beacon.id}
        </div>
        {beaconDisplayName ? (
          <div className="text-muted-foreground mt-1 font-mono text-xs break-all">
            {beacon.id}
          </div>
        ) : null}
      </div>
      <div className="max-w-full min-w-[9rem] grow basis-auto py-1">
        <div className="text-muted-foreground text-xs">Signal strength dBm</div>
        <div className="mt-1 text-sm font-medium break-words">
          {beacon.signalStrengthDbm}
        </div>
      </div>
    </div>
  );
}

function renderValue(
  value: unknown,
  locationBeaconDisplayNames?: Map<string, string>,
): ReactNode {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return (
      <div className="text-sm font-medium break-words">
        {formatPrimitiveValue(value)}
      </div>
    );
  }

  if (isIndoorBeacon(value)) {
    const beaconDisplayName =
      locationBeaconDisplayNames?.get(normaliseMacIdentifier(value.id)) ?? null;

    return renderIndoorBeacon(value, beaconDisplayName);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <div className="text-sm font-medium">None</div>;
    }

    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={index} className="rounded-lg border px-3 py-2">
            {renderValue(item, locationBeaconDisplayNames)}
          </div>
        ))}
      </div>
    );
  }

  if (isRecord(value)) {
    return (
      <FieldGrid
        data={value}
        locationBeaconDisplayNames={locationBeaconDisplayNames}
      />
    );
  }

  return <div className="text-sm font-medium break-words">{String(value)}</div>;
}

function FieldGrid({
  data,
  locationBeaconDisplayNames,
}: {
  data: Record<string, unknown>;
  locationBeaconDisplayNames?: Map<string, string>;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="max-w-full min-w-[9rem] grow basis-auto py-1">
          <div className="text-muted-foreground text-xs">
            {formatLabel(key)}
          </div>
          <div className="mt-1">
            {renderValue(value, locationBeaconDisplayNames)}
          </div>
        </div>
      ))}
    </div>
  );
}

function SummaryItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="text-sm font-medium break-all">{children}</div>
    </div>
  );
}

function DetailItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="text-sm font-medium break-all">{children}</div>
    </div>
  );
}

function SourceDetails({
  source,
  deviceName,
}: {
  source: ApiEventSource;
  deviceName: string | null;
}) {
  if (source.kind === "device") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <DetailItem label="Source type">
          Device
        </DetailItem>
        <DetailItem label="Device">
          <Link
            to={`/devices?fingerprint=${source.deviceFingerprint}`}
            className="text-sm font-medium text-blue-600 underline-offset-4 hover:underline"
          >
            {deviceName ?? source.deviceFingerprint}
          </Link>
        </DetailItem>
      </div>
    );
  }

  if (source.kind === "backend") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <DetailItem label="Source type">
          Backend
        </DetailItem>
        <DetailItem label="Service">
          {source.service}
        </DetailItem>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <DetailItem label="Source type">
        User
      </DetailItem>
      <DetailItem label="User ID">
        {source.userId}
      </DetailItem>
      <DetailItem label="Email">
        {source.userEmail}
      </DetailItem>
    </div>
  );
}

type EventDetailsPanelProps = {
  eventId: number | null;
};

export function EventDetailsPanel({ eventId }: EventDetailsPanelProps) {
  const isValidEventId =
    eventId !== null && Number.isInteger(eventId) && eventId > 0;

  const eventQuery = useQuery({
    queryKey: ["event", eventId],
    enabled: isValidEventId,
    retry: false,
    queryFn: async () => {
      const response = await axiosInstance.get<ApiEvent>(
        `/api/event/${eventId}`,
      );
      return response.data;
    },
  });

  const sourceFingerprint =
    eventQuery.data?.source.kind === "device"
      ? eventQuery.data.source.deviceFingerprint
      : null;

  const deviceQuery = useQuery({
    queryKey: ["device", sourceFingerprint],
    enabled: Boolean(sourceFingerprint),
    retry: false,
    queryFn: async () => {
      const response = await axiosInstance.get<ApiDevice>(
        `/api/device/web/${encodeURIComponent(sourceFingerprint!)}`,
      );
      return response.data;
    },
  });

  const shouldLoadLocationBeacons =
    eventQuery.data?.type === "indoorLocation";

  const locationBeaconsQuery = useQuery({
    queryKey: ["location-beacons"],
    enabled: shouldLoadLocationBeacons,
    retry: false,
    queryFn: async () => {
      const response = await axiosInstance.get<{ beacons: ApiLocationBeacon[] }>(
        "/api/misc/location-beacon",
      );
      return response.data.beacons;
    },
  });

  const locationBeaconDisplayNames = new Map(
    (locationBeaconsQuery.data ?? []).map((beacon) => [
      normaliseMacIdentifier(beacon.macIdentifier),
      beacon.displayName,
    ]),
  );

  const errorMessage = getAxiosErrorMessage(
    eventQuery.error,
    "Failed to load event.",
  );

  const detailErrorMessage =
    axios.isAxiosError(eventQuery.error) &&
    eventQuery.error.response?.status === 404
      ? "Event not found."
      : errorMessage;

  return (
    <Card className="gap-3 py-3">
      <CardContent className="px-3 py-0 text-sm">
        {!eventId ? (
          <div className="text-muted-foreground text-sm">
            Choose an event to inspect its source and data without leaving the
            table.
          </div>
        ) : !isValidEventId ? (
          <div className="text-sm">Invalid event id.</div>
        ) : eventQuery.isLoading ? (
          <div className="text-sm">Loading event...</div>
        ) : eventQuery.isError ? (
          <div className="text-sm">{detailErrorMessage}</div>
        ) : eventQuery.data ? (
          <div className="space-y-3">
            <div>
              <div className="mb-2 text-sm font-medium">Event metadata</div>

              <div className="grid gap-2 md:grid-cols-2">
                <SummaryItem label="ID">
                  {eventQuery.data.id}
                </SummaryItem>
                <SummaryItem label="Type">
                  {formatEventType(eventQuery.data.type)}
                </SummaryItem>
                <SummaryItem label="Time">
                  {formatDateTime(eventQuery.data.time, eventQuery.data.time)}
                </SummaryItem>
              </div>
            </div>
            <Separator />

            <div>
              <div className="mb-2 text-sm font-medium">Source details</div>
              <SourceDetails
                source={eventQuery.data.source}
                deviceName={deviceQuery.data?.name ?? null}
              />
            </div>

            {"data" in eventQuery.data && eventQuery.data.data != null ? (
              <>
                <Separator />
                <div>
                  <div className="mb-2 text-sm font-medium">Event data</div>
                  {isRecord(eventQuery.data.data) ? (
                    <FieldGrid
                      data={eventQuery.data.data}
                      locationBeaconDisplayNames={locationBeaconDisplayNames}
                    />
                  ) : (
                    renderValue(eventQuery.data.data, locationBeaconDisplayNames)
                  )}
                </div>
              </>
            ) : null}

            <Separator />

            <details className="rounded-lg border">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
                Advanced: JSON
              </summary>
              <div className="border-t px-3 py-3">
                <pre className="bg-muted overflow-x-auto rounded-lg p-3 text-xs">
                  {formatJson(eventQuery.data)}
                </pre>
              </div>
            </details>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
