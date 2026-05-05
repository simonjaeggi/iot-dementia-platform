import { EnvironmentLineChart } from "./environment-line-chart"
import MapWithGeocoder from "./map"
import { PageLayout } from "@/components/page-layout"

export default function Dashboard() {
  return (
    <PageLayout title="Dashboard" contentClassName="space-y-6">
      <EnvironmentLineChart />
      <MapWithGeocoder />
    </PageLayout>
  )
}
