import { axiosInstance, endpoints, type ApiEvent } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

type TemperaturePayload = { value: number; unit: "C" | "F" };
type NoiseLevelPayload = { approx_db: number; dbfs: number };
type LightIntensityPayload = { lux: number };
type HumidityPayload = { percentage: number };

export function TrendsOverview() {
  function useLatestEventQuery(eventType: string) {
    const queryResult = useQuery({
      queryKey: ["latest-event", eventType],
      queryFn: async () => {
        const response = await axiosInstance.get<ApiEvent>(
          endpoints.event.latestByType(eventType),
        );

        return response.data;
      },
    });

    return queryResult.data;
  }
  const latestTemperatureValue = (
    useLatestEventQuery("temperature")?.data.data as
      | TemperaturePayload
      | undefined
  )?.value;

  const latestNoiseLevelValue = (
    useLatestEventQuery("noiseLevel")?.data.data as
      | NoiseLevelPayload
      | undefined
  )?.approx_db;

  const latestLightIntensityValue = (
    useLatestEventQuery("lightIntensity")?.data.data as
      | LightIntensityPayload
      | undefined
  )?.lux;

  const latestHumidityValue = (
    useLatestEventQuery("humidity")?.data.data as HumidityPayload | undefined
  )?.percentage;

  const latestTemperature =
    latestTemperatureValue === undefined
      ? "No Data"
      : `${latestTemperatureValue} °C`;

  const latestNoiseLevel =
    latestNoiseLevelValue === undefined
      ? "No Data"
      : `${latestNoiseLevelValue} dB`;

  const latestLightIntensity =
    latestLightIntensityValue === undefined
      ? "No Data"
      : `${latestLightIntensityValue} lx`;

  const latestHumidity =
    latestHumidityValue === undefined ? "No Data" : `${latestHumidityValue} %`;

  return (
    <div className="grid overflow-hidden rounded-lg border bg-card sm:grid-cols-2 [&>*]:border-border/70 [&>*]:border-b sm:[&>*:nth-child(odd)]:border-r sm:[&>*:nth-last-child(-n+2)]:border-b-0">
      <TrendsOverviewSection label="temperature" value={latestTemperature} />
      <TrendsOverviewSection
        label="noise level"
        value={latestNoiseLevel}
      />
      <TrendsOverviewSection
        label="light intensity"
        value={latestLightIntensity}
      />
      <TrendsOverviewSection label="humidity" value={latestHumidity} />
    </div>
  );
}

function TrendsOverviewSection({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="p-4">
      <div className="text-muted-foreground text-xs font-medium uppercase">
        Latest {label}
      </div>
      <div className="text-foreground mt-2 text-3xl font-semibold tracking-normal xl:text-4xl">
        {value}
      </div>
    </div>
  );
}
