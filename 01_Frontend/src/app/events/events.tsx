import { X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { AppSidebar } from "@/components/app-sidebar";
import { EventDetailsPanel } from "@/components/event-details-panel";
import { EventTable } from "@/components/event-table";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function Events() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawValue = searchParams.get("eventId");
  const parsedValue = rawValue ? Number(rawValue) : null;
  const selectedEventId =
    parsedValue !== null && Number.isInteger(parsedValue) && parsedValue > 0
      ? parsedValue
      : null;

  function setSelectedEvent(eventId: number | null) {
    const nextParams = new URLSearchParams(searchParams);

    if (eventId === null) {
      nextParams.delete("eventId");
    } else {
      nextParams.set("eventId", String(eventId));
    }

    setSearchParams(nextParams, { replace: true });
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Events" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <div
                  className={
                    selectedEventId === null
                      ? ""
                      : "grid gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(20rem,24rem)] xl:items-start"
                  }
                >
                  <EventTable
                    selectedEventId={selectedEventId}
                    onSelectEvent={setSelectedEvent}
                  />
                  {selectedEventId !== null ? (
                    <div className="space-y-4">
                      <div className="flex h-9 items-center justify-between gap-2">
                        <h2 className="text-base font-semibold">
                          Event Details
                        </h2>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="size-7"
                          onClick={() => setSelectedEvent(null)}
                        >
                          <X className="size-4" />
                          <span className="sr-only">Close event details</span>
                        </Button>
                      </div>
                      <EventDetailsPanel eventId={selectedEventId} />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
