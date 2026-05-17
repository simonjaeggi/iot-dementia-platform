import { useEffect, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { CheckCheck, Trash2, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { NotificationDetailsPanel } from "./notification-details-panel";
import { NotificationTable } from "./notification-table";
import { PageLayout } from "@/components/page-layout";
import { TablePaginationFooter } from "@/components/table-pagination-footer";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import {
  axiosInstance,
  endpoints,
  getAxiosErrorMessage,
  InboxNotificationsResponseSchema,
} from "@/lib/api";

const QUERY_DEBOUNCE_MS = 300;
const PAGE_SIZE = 25;

export default function NotificationInbox() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const rawPageNumber = Number(searchParams.get("pageNumber"));
  const pageNumber =
    Number.isInteger(rawPageNumber) && rawPageNumber > 0 ? rawPageNumber : 1;

  const trimmedQuery = (searchParams.get("query") ?? "").trim();

  const rawNotificationId = Number(searchParams.get("notificationId"));
  const selectedNotificationId =
    Number.isInteger(rawNotificationId) && rawNotificationId > 0
      ? rawNotificationId
      : null;

  const [filterInput, setFilterInput] = useState(trimmedQuery);
  const debouncedQuery = useDebouncedValue(
    filterInput.trim(),
    QUERY_DEBOUNCE_MS,
  );

  useEffect(() => {
    if (debouncedQuery === trimmedQuery) return;

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (debouncedQuery) {
          next.set("query", debouncedQuery);
        } else {
          next.delete("query");
        }
        next.delete("pageNumber");
        next.delete("notificationId");
        return next;
      },
      { replace: true },
    );
  }, [debouncedQuery, trimmedQuery, setSearchParams]);

  const notificationsQuery = useQuery({
    queryKey: ["notifications", pageNumber, PAGE_SIZE, trimmedQuery],
    queryFn: async () => {
      const response = await axiosInstance.get(endpoints.notification.list, {
        params: {
          pageNumber,
          pageSize: PAGE_SIZE,
          ...(trimmedQuery ? { query: trimmedQuery } : {}),
        },
      });
      return InboxNotificationsResponseSchema.parse(response.data);
    },
    placeholderData: keepPreviousData,
    retry: false,
  });

  const notifications = notificationsQuery.data?.data ?? [];
  const totalRows = notificationsQuery.data?.totalRows ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  const selectedNotification =
    notifications.find(
      (notification) => notification.id === selectedNotificationId,
    ) ?? null;

  function setSelectedNotification(notificationId: number | null) {
    const nextParams = new URLSearchParams(searchParams);

    if (notificationId === null) {
      nextParams.delete("notificationId");
    } else {
      nextParams.set("notificationId", String(notificationId));
    }

    setSearchParams(nextParams, { replace: true });
  }

  function handleSelectNotification(notificationId: number) {
    setSelectedNotification(notificationId);

    const notification = notifications.find(
      (item) => item.id === notificationId,
    );

    if (!notification || notification.readAt) return;

    markAsReadMutation.mutate(notificationId);
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

    nextParams.delete("notificationId");
    setSearchParams(nextParams, { replace: true });
  }

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await axiosInstance.post(endpoints.notification.markAllRead);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Marked all notifications as read.");
    },
    onError: (error) => {
      toast.error(
        getAxiosErrorMessage(error, "Failed to mark notifications as read."),
      );
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await axiosInstance.post(endpoints.notification.markRead(notificationId));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: async (error) => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.error(
        getAxiosErrorMessage(error, "Failed to mark notification as read."),
      );
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      await axiosInstance.delete(endpoints.notification.deleteAll);
    },
    onSuccess: async () => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("notificationId");
      nextParams.delete("pageNumber");
      setSearchParams(nextParams, { replace: true });

      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Deleted all notifications.");
    },
    onError: (error) => {
      toast.error(
        getAxiosErrorMessage(error, "Failed to delete notifications."),
      );
    },
  });

  const inboxIsEmpty = totalRows === 0;
  const isMutating =
    markAllAsReadMutation.isPending || deleteAllMutation.isPending;

  return (
    <PageLayout title="Notification Inbox">
      <div
        className={
          selectedNotificationId === null
            ? ""
            : "grid gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(20rem,24rem)] xl:items-start"
        }
      >
        <div className="space-y-4">
          <NotificationTable
            notifications={notifications}
            isLoading={notificationsQuery.isLoading}
            error={notificationsQuery.error}
            selectedNotificationId={selectedNotificationId}
            onSelectNotification={handleSelectNotification}
            filterValue={filterInput}
            onFilterValueChange={setFilterInput}
            toolbarActions={
              <>
                <Button
                  variant="outline"
                  disabled={inboxIsEmpty || isMutating}
                  onClick={() => markAllAsReadMutation.mutate(undefined)}
                >
                  <CheckCheck className="size-4" />
                  Mark all as read
                </Button>
                <Button
                  variant="destructive"
                  disabled={inboxIsEmpty || isMutating}
                  onClick={() => deleteAllMutation.mutate(undefined)}
                >
                  <Trash2 className="size-4" />
                  Delete all
                </Button>
              </>
            }
          />
          <TablePaginationFooter
            page={pageNumber}
            totalPages={totalPages}
            totalRows={totalRows}
            pageSize={PAGE_SIZE}
            isFetching={notificationsQuery.isFetching}
            onPageChange={setPage}
          />
        </div>
        {selectedNotification ? (
          <div className="space-y-4">
            <div className="flex h-9 items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Notification Details</h2>
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-7"
                onClick={() => setSelectedNotification(null)}
              >
                <X className="size-4" />
                <span className="sr-only">Close notification details</span>
              </Button>
            </div>
            <NotificationDetailsPanel notification={selectedNotification} />
          </div>
        ) : null}
      </div>
    </PageLayout>
  );
}
