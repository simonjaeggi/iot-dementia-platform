import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { type ApiEvent } from "@/lib/api";
import {
  formatChartDate,
  formatDateTime,
  formatNumberWithUnit,
} from "@/lib/detail-formatters";
import { useDeviceDisplayNames } from "@/lib/device-helpers";

type Timeframe = "1d" | "7d" | "30d";

type ChartDatum = {
  time: string;
  [seriesKey: string]: number | string | undefined;
};

type TrendChartProps = {
  eventType: string;
  label: string;
  unit: string;
  precision: number;
  events: ApiEvent[];
  isLoading?: boolean;
};

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function TrendChart({
  eventType,
  label,
  unit,
  precision,
  events,
  isLoading = false,
}: TrendChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("7d");

  const series = useMemo(
    () => buildSeriesData(events, timeframe),
    [events, timeframe],
  );

  const seriesKeys = Array.from(series.keys).slice(0, 5);
  const deviceNamesByFingerprint = useDeviceDisplayNames(seriesKeys);
  const chartConfig: ChartConfig = Object.fromEntries(
    seriesKeys.map((key, index) => [
      key,
      {
        label: deviceNamesByFingerprint.get(key) ?? "Unnamed device",
        color: CHART_COLORS[index % CHART_COLORS.length],
      },
    ]),
  );

  const titleCase = label.charAt(0).toUpperCase() + label.slice(1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="leading-none font-semibold">{titleCase} trends</div>
        </div>
        <Select
          value={timeframe}
          onValueChange={(value) => setTimeframe(value as Timeframe)}
        >
          <SelectTrigger className="w-full sm:w-32" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1d">1 day</SelectItem>
            <SelectItem value="7d">7 days</SelectItem>
            <SelectItem value="30d">30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground flex h-[320px] items-center justify-center gap-2 text-sm">
          <Spinner />
          Loading {label} trends...
        </div>
      ) : series.data.length !== 0 && seriesKeys.length !== 0 ? (
        <ChartContainer config={chartConfig} className="h-[320px] w-full">
          <LineChart
            accessibilityLayer
            data={series.data}
            margin={{ left: 12, right: 12, top: 8 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              minTickGap={32}
              tickMargin={8}
              tickFormatter={(value) =>
                formatChartDate(String(value), timeframe === "1d")
              }
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={40}
              tickMargin={8}
              tickFormatter={(value) =>
                formatNumberWithUnit(Number(value), unit, precision)
              }
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => formatDateTime(String(value))}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            {seriesKeys.map((key) => (
              <Line
                key={`${eventType}-${key}`}
                type="monotone"
                dataKey={key}
                stroke={`var(--color-${key})`}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ChartContainer>
      ) : (
        "No data found."
      )}
    </div>
  );
}

function buildSeriesData(
  events: ApiEvent[],
  timeframe: Timeframe,
) {
  const days = timeframe === "1d" ? 1 : timeframe === "7d" ? 7 : 30;
  const cutoff = Date.now() - days * 86_400_000;
  const keys = new Set<string>();
  const buckets = new Map<string, Map<string, { sum: number; count: number }>>();

  for (const event of events) {
    if (event.data.source.kind !== "device") continue;
    const fingerprint = event.data.source.deviceFingerprint;
    if (!fingerprint) continue;

    const value = getNumericEventValue(event);
    if (value === null) continue;

    const time = new Date(event.time).getTime();
    if (Number.isNaN(time) || time < cutoff) continue;

    const bucket = bucketKey(time);
    const seriesBucket = buckets.get(bucket) ?? new Map();
    const agg = seriesBucket.get(fingerprint) ?? { sum: 0, count: 0 };
    agg.sum += value;
    agg.count += 1;
    seriesBucket.set(fingerprint, agg);
    buckets.set(bucket, seriesBucket);
    keys.add(fingerprint);
  }

  const data: ChartDatum[] = Array.from(buckets.entries())
    .map(([time, seriesBucket]) => {
      const datum: ChartDatum = { time };
      for (const [fp, agg] of seriesBucket) {
        datum[fp] = agg.sum / agg.count;
      }
      return datum;
    })
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  return { data, keys };
}

function getNumericEventValue(event: ApiEvent): number | null {
  const payload = event.data.data;
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return null;
  }

  if (event.type === "noiseLevel") {
    const value = (payload as { approx_db?: unknown }).approx_db;
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }

  for (const value of Object.values(payload)) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function bucketKey(timeMs: number) {
  const date = new Date(timeMs);
  date.setMinutes(0, 0, 0);
  return date.toISOString();
}
