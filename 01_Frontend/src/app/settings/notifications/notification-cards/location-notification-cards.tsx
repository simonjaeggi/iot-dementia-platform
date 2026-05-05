import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  SubscriptionCardShell,
  type NotificationCardProps,
} from "../subscription-card-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDurationToSeconds, formatOptionalNumber } from "@/lib/detail-formatters";

export function OutdoorGeofenceNotificationCard(props: NotificationCardProps) {
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radiusMeters, setRadiusMeters] = useState("");
  const latValue = formatOptionalNumber(lat);
  const lngValue = formatOptionalNumber(lng);
  const radiusValue = formatOptionalNumber(radiusMeters);
  const thresholdConfig =
    latValue === undefined ||
    lngValue === undefined ||
    radiusValue === undefined
      ? null
      : {
          category: "stateGeoRadius" as const,
          lat: latValue,
          lng: lngValue,
          radiusMeters: radiusValue,
        };

  return (
    <SubscriptionCardShell
      {...props}
      type="outdoorGeofenceCrossed"
      title="Entered or left the house"
      thresholdConfig={thresholdConfig}
    >
      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium text-muted-foreground">
          House boundary
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <Input
            type="number"
            step="any"
            placeholder="Latitude"
            value={lat}
            onChange={(event) => setLat(event.target.value)}
          />
          <Input
            type="number"
            step="any"
            placeholder="Longitude"
            value={lng}
            onChange={(event) => setLng(event.target.value)}
          />
        </div>
        <Input
          type="number"
          min="10.01"
          step="any"
          placeholder="Radius in meters"
          value={radiusMeters}
          onChange={(event) => setRadiusMeters(event.target.value)}
        />
        <div className="text-xs text-muted-foreground">
          Alerts are sent once when the person enters or leaves the house area.
        </div>
      </div>
    </SubscriptionCardShell>
  );
}

export function FallDetectionNotificationCard(props: NotificationCardProps) {
  const [minImpactG, setMinImpactG] = useState("");
  const [noRoomChangeDelaySeconds, setNoRoomChangeDelaySeconds] = useState("");
  const minImpact = formatOptionalNumber(minImpactG);
  const delay = formatOptionalNumber(noRoomChangeDelaySeconds);
  const thresholdConfig =
    minImpact === undefined || delay === undefined
      ? null
      : {
          category: "fallDetection" as const,
          minImpactG: minImpact,
          noRoomChangeDelaySeconds: delay,
        };

  return (
    <SubscriptionCardShell
      {...props}
      type="fallDetection"
      title="Fall detection"
      thresholdConfig={thresholdConfig}
    >
      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium text-muted-foreground">
          Fall condition
        </div>
        <Input
          type="number"
          min="0.01"
          step="any"
          placeholder="Minimum acceleration in g"
          value={minImpactG}
          onChange={(event) => setMinImpactG(event.target.value)}
        />
        <Input
          type="number"
          min="0.01"
          step="any"
          placeholder="No room change delay in seconds"
          value={noRoomChangeDelaySeconds}
          onChange={(event) => setNoRoomChangeDelaySeconds(event.target.value)}
        />
      </div>
    </SubscriptionCardShell>
  );
}

export function SameRoomTooLongNotificationCard(
  props: NotificationCardProps,
) {
  const [durationInput, setDurationInput] = useState("");
  const [durationUnit, setDurationUnit] = useState<"minutes" | "hours">(
    "minutes",
  );
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("22:00");
  const durationSeconds = formatDurationToSeconds(durationInput, durationUnit);
  const thresholdConfig =
    durationSeconds === undefined
      ? null
      : {
          category: "indoorBeaconDuration" as const,
          durationSeconds,
          startTime,
          endTime,
        };

  return (
    <SubscriptionCardShell
      {...props}
      type="sameRoomTooLong"
      title="Same room too long"
      thresholdConfig={thresholdConfig}
    >
      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium text-muted-foreground">
          Room stay condition
        </div>
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_10rem]">
          <Input
            type="number"
            min="0.01"
            step="any"
            placeholder="Duration"
            value={durationInput}
            onChange={(event) => setDurationInput(event.target.value)}
          />
          <Select
            value={durationUnit}
            onValueChange={(value: "minutes" | "hours") =>
              setDurationUnit(value)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minutes">Minutes</SelectItem>
              <SelectItem value="hours">Hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <Input
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
          />
          <Input
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
          />
        </div>
      </div>
    </SubscriptionCardShell>
  );
}
