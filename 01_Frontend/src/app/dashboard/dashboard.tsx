import { HistoryTabs } from "./history/history-tabs";
import { InfrastructureStates } from "./infrastructure-states";
import { LocationOverview } from "./location-overview";
import { TrendsOverview } from "./trends-overview";
import { PageLayout } from "@/components/page-layout";

export default function Dashboard() {
  return (
    <PageLayout
      title="Dashboard"
      contentClassName="grid items-start gap-6 lg:grid-cols-[24rem_minmax(0,1fr)]"
    >
      <div className="grid gap-6">
        <TrendsOverview />
        <LocationOverview />
        <InfrastructureStates />
      </div>
      <HistoryTabs />
    </PageLayout>
  );
}
