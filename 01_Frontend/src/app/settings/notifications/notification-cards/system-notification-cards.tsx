import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InfrastructureStatus, SubscriptionType } from "@/lib/api";
import {
  SubscriptionCardShell,
  type NotificationCardProps,
} from "../subscription-card-shell";
import { formatDurationToSeconds } from "@/lib/detail-formatters";

export function InfrastructureStatusNotificationCard(
  props: NotificationCardProps,
) {
  const [status, setStatus] = useState<InfrastructureStatus>("open");
  const [durationInput, setDurationInput] = useState("");
  const [durationUnit, setDurationUnit] = useState<"minutes" | "hours">(
    "minutes",
  );
  const durationSeconds = formatDurationToSeconds(durationInput, durationUnit);
  const thresholdConfig =
    durationSeconds === undefined
      ? null
      : {
          category: "infrastructureStateDuration" as const,
          status,
          durationSeconds,
        };

  return (
    <SubscriptionCardShell
      {...props}
      type="infrastructureStatusTooLong"
      title="Infrastructure"
      thresholdConfig={thresholdConfig}
    >
      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium text-muted-foreground">
          Timeout condition
        </div>
        <Select
          value={status}
          onValueChange={(value: InfrastructureStatus) => setStatus(value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
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
      </div>
    </SubscriptionCardShell>
  );
}

function SimpleNotificationCard({
  type,
  title,
  ...props
}: NotificationCardProps & { type: SubscriptionType; title: string }) {
  return (
    <SubscriptionCardShell
      {...props}
      type={type}
      title={title}
      thresholdConfig={null}
    />
  );
}

export function CorruptDeviceConfigNotificationCard(
  props: NotificationCardProps,
) {
  return (
    <SimpleNotificationCard
      {...props}
      type="corruptDeviceConfig"
      title="Corrupt device config"
    />
  );
}

export function UpdateAvailableNotificationCard(props: NotificationCardProps) {
  return (
    <SimpleNotificationCard
      {...props}
      type="updateAvailable"
      title="Update available"
    />
  );
}

export function SystemBootNotificationCard(props: NotificationCardProps) {
  return (
    <SimpleNotificationCard
      {...props}
      type="systemBoot"
      title="System boot"
    />
  );
}
