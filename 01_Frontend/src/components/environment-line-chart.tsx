import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { axiosInstance, getAxiosErrorMessage } from "@/lib/api"

type TemperatureEvent = {
  id: number
  type: "temperature"
  time: string
  data: {
    value: number
    unit: "C" | "F"
  }
}

type HumidityEvent = {
  id: number
  type: "humidity"
  time: string
  data: {
    percentage: number
  }
}

type NoiseLevelEvent = {
  id: number
  type: "noiseLevel"
  time: string
  data: {
    db: number
  }
}

type ApiEvent =
  | TemperatureEvent
  | HumidityEvent
  | NoiseLevelEvent
  | {
      id: number
      type: string
      time: string
      data?: unknown
    }

type MetricKey = "temperature" | "humidity" | "noiseLevel"
type TimeRange = "24h" | "7d" | "30d"

const metricOptions: Record<
  MetricKey,
  {
    label: string
    unit: string
    color: string
    precision: number
    getValue: (event: TemperatureEvent | HumidityEvent | NoiseLevelEvent) => number
  }
> = {
  temperature: {
    label: "Temperature",
    unit: "C",
    color: "var(--chart-1)",
    precision: 1,
    getValue: (event) => (event as TemperatureEvent).data.value,
  },
  humidity: {
    label: "Humidity",
    unit: "%",
    color: "var(--chart-2)",
    precision: 0,
    getValue: (event) => (event as HumidityEvent).data.percentage,
  },
  noiseLevel: {
    label: "Noise level",
    unit: "dB",
    color: "var(--chart-3)",
    precision: 0,
    getValue: (event) => (event as NoiseLevelEvent).data.db,
  },
}

const rangeLabels: Record<TimeRange, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
}

function isMetricEvent(event: ApiEvent, metric: MetricKey) {
  return event.type === metric
}

function subtractRange(referenceDate: Date, range: TimeRange) {
  const startDate = new Date(referenceDate)

  if (range === "24h") {
    startDate.setHours(startDate.getHours() - 24)
    return startDate
  }

  startDate.setDate(startDate.getDate() - (range === "7d" ? 7 : 30))
  return startDate
}

function formatXAxisLabel(value: string, range: TimeRange) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(range === "24h" ? { hour: "numeric" as const } : {}),
  })
}

function formatTooltipLabel(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function EnvironmentLineChart() {
  const [metric, setMetric] = React.useState<MetricKey>("temperature")
  const [timeRange, setTimeRange] = React.useState<TimeRange>("7d")

  const eventsQuery = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const response = await axiosInstance.get<{ events: ApiEvent[] }>("/api/event")
      return response.data.events
    },
  })

  const selectedMetric = metricOptions[metric]

  const chartData = React.useMemo(() => {
    const metricEvents = (eventsQuery.data ?? [])
      .filter((event): event is TemperatureEvent | HumidityEvent | NoiseLevelEvent =>
        isMetricEvent(event, metric)
      )
      .sort(
        (left, right) =>
          new Date(left.time).getTime() - new Date(right.time).getTime()
      )

    if (metricEvents.length === 0) {
      return []
    }

    const referenceDate = new Date(metricEvents[metricEvents.length - 1].time)
    const startDate = subtractRange(referenceDate, timeRange)

    return metricEvents
      .filter((event) => new Date(event.time) >= startDate)
      .map((event) => ({
        time: event.time,
        value: selectedMetric.getValue(event),
      }))
  }, [eventsQuery.data, metric, selectedMetric, timeRange])

  const chartConfig = React.useMemo(
    () =>
      ({
        value: {
          label: selectedMetric.label,
          color: selectedMetric.color,
        },
      }) satisfies ChartConfig,
    [selectedMetric]
  )

  const latestValue = chartData[chartData.length - 1]?.value
  const errorMessage = getAxiosErrorMessage(
    eventsQuery.error,
    "Failed to load environmental events."
  )

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Environmental trends</CardTitle>
          <CardDescription>
            {latestValue == null
              ? `No ${selectedMetric.label.toLowerCase()} readings in ${rangeLabels[timeRange].toLowerCase()}.`
              : `Latest ${selectedMetric.label.toLowerCase()}: ${latestValue.toFixed(selectedMetric.precision)} ${selectedMetric.unit}`}
          </CardDescription>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select
            value={metric}
            onValueChange={(value) => setMetric(value as MetricKey)}
          >
            <SelectTrigger className="w-full sm:w-40" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="temperature">Temperature</SelectItem>
              <SelectItem value="humidity">Humidity</SelectItem>
              <SelectItem value="noiseLevel">Noise level</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={timeRange}
            onValueChange={(value) => setTimeRange(value as TimeRange)}
          >
            <SelectTrigger className="w-full sm:w-40" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {eventsQuery.isLoading ? (
          <div className="text-muted-foreground text-sm">
            Loading environmental data...
          </div>
        ) : eventsQuery.isError ? (
          <div className="text-destructive text-sm">{errorMessage}</div>
        ) : chartData.length === 0 ? (
          <div className="text-muted-foreground text-sm">
            No matching environmental readings found.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[320px] w-full">
            <LineChart
              accessibilityLayer
              data={chartData}
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
                  formatXAxisLabel(String(value), timeRange)
                }
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={40}
                tickMargin={8}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      formatTooltipLabel(String(value))
                    }
                    formatter={(value) => (
                      <span className="font-medium">
                        {Number(value).toFixed(selectedMetric.precision)}{" "}
                        {selectedMetric.unit}
                      </span>
                    )}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--color-value)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
