import { useQuery } from "@tanstack/react-query";

import { IndoorHistory } from "./indoor-history";
import { OutdoorMap } from "./outdoor-map";
import { TrendChart } from "./trend-chart";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { axiosInstance, endpoints, type ApiEvent } from "@/lib/api";

const LOOKBACK_DAYS = 30;

const activeTriggerClass =
  "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground";

export function HistoryTabs() {
  const temperature = useTrendEventQuery("temperature");
  const noise = useTrendEventQuery("noiseLevel");
  const light = useTrendEventQuery("lightIntensity");
  const humidity = useTrendEventQuery("humidity");

  return (
    <Card>
      <CardContent>
        <Tabs defaultValue="temperature">
          <TabsList>
            <TabsTrigger value="temperature" className={activeTriggerClass}>Temperature</TabsTrigger>
            <TabsTrigger value="noise" className={activeTriggerClass}>Noise</TabsTrigger>
            <TabsTrigger value="light" className={activeTriggerClass}>Light</TabsTrigger>
            <TabsTrigger value="humidity" className={activeTriggerClass}>Humidity</TabsTrigger>
            <TabsTrigger value="outdoor" className={activeTriggerClass}>Outdoor location</TabsTrigger>
            <TabsTrigger value="indoor" className={activeTriggerClass}>Indoor location</TabsTrigger>
          </TabsList>

          <TabsContent value="temperature" className="mt-4">
            <TrendChart
              eventType="temperature"
              label="temperature"
              unit="C"
              precision={1}
              events={temperature.data ?? []}
              isLoading={temperature.isLoading}
            />
          </TabsContent>
          <TabsContent value="noise" className="mt-4">
            <TrendChart
              eventType="noiseLevel"
              label="noise level"
              unit="dB"
              precision={1}
              events={noise.data ?? []}
              isLoading={noise.isLoading}
            />
          </TabsContent>
          <TabsContent value="light" className="mt-4">
            <TrendChart
              eventType="lightIntensity"
              label="light intensity"
              unit="lux"
              precision={0}
              events={light.data ?? []}
              isLoading={light.isLoading}
            />
          </TabsContent>
          <TabsContent value="humidity" className="mt-4">
            <TrendChart
              eventType="humidity"
              label="humidity"
              unit="%"
              precision={0}
              events={humidity.data ?? []}
              isLoading={humidity.isLoading}
            />
          </TabsContent>
          <TabsContent value="outdoor" className="mt-4">
            <OutdoorMap />
          </TabsContent>
          <TabsContent value="indoor" className="mt-4">
            <IndoorHistory />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function useTrendEventQuery(eventType: string) {
  return useQuery({
    queryKey: ["events", eventType, LOOKBACK_DAYS],
    queryFn: async () => {
      const response = await axiosInstance.get<ApiEvent[]>(
        endpoints.event.byTypeAndDays(LOOKBACK_DAYS, eventType),
      );
      return response.data;
    },
  });
}
