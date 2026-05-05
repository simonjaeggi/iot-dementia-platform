import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  MAX_PANIC_DETECTION_DURATION_SECONDS,
  type NumericThresholdField,
  type SubscriptionType,
} from "@/lib/api";
import {
  SubscriptionCardShell,
  type NotificationCardProps,
} from "../subscription-card-shell";
import { formatOptionalNumber } from "@/lib/detail-formatters";


type NumericCardProps = NotificationCardProps & {
  type: Extract<
    SubscriptionType,
    "temperature" | "humidity" | "lightIntensity" | "noiseLevel"
  >;
  title: string;
  field: NumericThresholdField;
  unit: string;
  sliderMin: number;
  sliderMax: number;
  step: number;
};

function NumericNotificationCard({
  type,
  title,
  field,
  unit,
  sliderMin,
  sliderMax,
  step,
  ...props
}: NumericCardProps) {
  const [min, setMin] = useState(String(sliderMin));
  const [max, setMax] = useState(String(sliderMax));
  const minValue = formatOptionalNumber(min);
  const maxValue = formatOptionalNumber(max);
  const thresholdConfig =
    minValue === undefined || maxValue === undefined
      ? null
      : {
          category: "eventNumeric" as const,
          field,
          min: minValue,
          max: maxValue,
        };

  return (
    <SubscriptionCardShell
      {...props}
      type={type}
      title={title}
      thresholdConfig={thresholdConfig}
    >
      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium text-muted-foreground">
          Normal range
        </div>
        <div className="rounded-md border px-3 py-4">
          <Slider
            min={sliderMin}
            max={sliderMax}
            step={step}
            value={[minValue ?? sliderMin, maxValue ?? sliderMax]}
            minStepsBetweenThumbs={1}
            onValueChange={([nextMin, nextMax]) => {
              if (nextMin !== undefined) setMin(String(nextMin));
              if (nextMax !== undefined) setMax(String(nextMax));
            }}
          />
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {min} {unit}
            </span>
            <span>
              {max} {unit}
            </span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Alerts are sent when {title.toLowerCase()} leaves this range.
        </div>
      </div>
    </SubscriptionCardShell>
  );
}

export function TemperatureNotificationCard(props: NotificationCardProps) {
  return (
    <NumericNotificationCard
      {...props}
      type="temperature"
      title="Temperature"
      field="value"
      unit="C"
      sliderMin={-20}
      sliderMax={50}
      step={0.5}
    />
  );
}

export function HumidityNotificationCard(props: NotificationCardProps) {
  return (
    <NumericNotificationCard
      {...props}
      type="humidity"
      title="Humidity"
      field="percentage"
      unit="%"
      sliderMin={0}
      sliderMax={100}
      step={1}
    />
  );
}

export function LightIntensityNotificationCard(props: NotificationCardProps) {
  return (
    <NumericNotificationCard
      {...props}
      type="lightIntensity"
      title="Light intensity"
      field="lux"
      unit="lux"
      sliderMin={0}
      sliderMax={10000}
      step={10}
    />
  );
}

export function NoiseLevelNotificationCard(props: NotificationCardProps) {
  return (
    <NumericNotificationCard
      {...props}
      type="noiseLevel"
      title="Noise level"
      field="db"
      unit="dB"
      sliderMin={0}
      sliderMax={120}
      step={1}
    />
  );
}

export function PanicDetectionNotificationCard(props: NotificationCardProps) {
  const [minDb, setMinDb] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");
  const minDbValue = formatOptionalNumber(minDb);
  const durationValue = formatOptionalNumber(durationSeconds);
  const thresholdConfig =
    minDbValue === undefined || durationValue === undefined
      ? null
      : {
          category: "noiseLevelDuration" as const,
          minDb: minDbValue,
          durationSeconds: durationValue,
        };

  return (
    <SubscriptionCardShell
      {...props}
      type="panicDetection"
      title="Panic detection"
      thresholdConfig={thresholdConfig}
    >
      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium text-muted-foreground">
          Panic condition
        </div>
        <Input
          type="number"
          step="any"
          placeholder="Minimum noise level in dB"
          value={minDb}
          onChange={(event) => setMinDb(event.target.value)}
        />
        <Input
          type="number"
          min="0.01"
          max={String(MAX_PANIC_DETECTION_DURATION_SECONDS)}
          step="any"
          placeholder="Duration in seconds"
          value={durationSeconds}
          onChange={(event) => setDurationSeconds(event.target.value)}
        />
      </div>
    </SubscriptionCardShell>
  );
}
