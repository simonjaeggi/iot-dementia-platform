import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { EventDetailsPanel } from "./event-details-panel";
import { EventTable } from "./event-table";
import { PageLayout } from "@/components/page-layout";
import { TablePaginationFooter } from "@/components/table-pagination-footer";
import { Button } from "@/components/ui/button";
import { axiosInstance, endpoints, type EventsResponse } from "@/lib/api";

const PAGE_SIZE = 15;

export default function Events() {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawPageNumber = Number(searchParams.get("pageNumber"));
  const pageNumber =
    Number.isInteger(rawPageNumber) && rawPageNumber > 0 ? rawPageNumber : 1;

  const rawEventId = Number(searchParams.get("eventId"));
  const selectedEventId =
    Number.isInteger(rawEventId) && rawEventId > 0 ? rawEventId : null;
  const selectedType = searchParams.get("type") ?? undefined;

  const eventsQuery = useQuery({
    queryKey: ["events", pageNumber, PAGE_SIZE, selectedType],
    queryFn: async () => {
      const response = await axiosInstance.get<EventsResponse>(
        endpoints.event.list,
        {
          params: {
            pageNumber,
            pageSize: PAGE_SIZE,
            ...(selectedType ? { type: selectedType } : {}),
          },
        },
      );
      return response.data;
    },
    placeholderData: keepPreviousData,
    retry: false,
  });

  const events = eventsQuery.data?.data ?? [];
  const totalRows = eventsQuery.data?.totalRows ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  function setSelectedEvent(eventId: number | null) {
    const nextParams = new URLSearchParams(searchParams);

    if (eventId === null) {
      nextParams.delete("eventId");
    } else {
      nextParams.set("eventId", String(eventId));
    }

    setSearchParams(nextParams, { replace: true });
  }

  function setSelectedType(type: string | null) {
    const nextParams = new URLSearchParams(searchParams);

    if (type === null) {
      nextParams.delete("type");
    } else {
      nextParams.set("type", type);
    }

    nextParams.delete("pageNumber");
    nextParams.delete("eventId");
    setSearchParams(nextParams, { replace: true });
  }

  function setPage(nextPage: number) {
    const clamped = Math.min(Math.max(1, nextPage), totalPages);
    if (clamped === pageNumber) return;

    const nextParams = new URLSearchParams(searchParams);

    if (clamped === 1) {
      nextParams.delete("pageNumber");
    } else {
      nextParams.set("pageNumber", String(clamped));
    }

    nextParams.delete("eventId");
    setSearchParams(nextParams, { replace: true });
  }

  return (
    <PageLayout title="Events">
      <div
        className={
          selectedEventId === null
            ? ""
            : "grid gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(20rem,24rem)] xl:items-start"
        }
      >
        <div className="space-y-4">
          <EventTable
          events={events}
          isLoading={eventsQuery.isLoading}
          error={eventsQuery.error}
          selectedType={selectedType}
          onSelectedTypeChange={setSelectedType}
          selectedEventId={selectedEventId}
          onSelectEvent={setSelectedEvent}
        />
          <TablePaginationFooter
            page={pageNumber}
            totalPages={totalPages}
            totalRows={totalRows}
            pageSize={PAGE_SIZE}
            isFetching={eventsQuery.isFetching}
            onPageChange={setPage}
          />
        </div>
        {selectedEventId !== null ? (
          <div className="space-y-4">
            <div className="flex h-9 items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Event Details</h2>
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
    </PageLayout>
  );
}
