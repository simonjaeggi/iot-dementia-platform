import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { AppSidebar } from "@/components/app-sidebar";
import {
  NotificationDetailsPanel,
} from "@/components/notification-details-panel";
import {
  InboxNotificationsResponseSchema,
  NotificationTable,
} from "@/components/notification-table";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { axiosInstance } from "@/lib/api";

export default function NotificationInbox() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawValue = searchParams.get("notificationId");
  const parsedValue = rawValue ? Number(rawValue) : null;
  const selectedNotificationId =
    parsedValue !== null && Number.isInteger(parsedValue) && parsedValue > 0
      ? parsedValue
      : null;

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await axiosInstance.get("/api/notification");
      const notifications = InboxNotificationsResponseSchema.parse(
        response.data,
      ).notifications;

      return notifications.sort(
        (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
      );
    },
    retry: false,
  });

  const selectedNotification =
    notificationsQuery.data?.find(
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
        <SiteHeader title="Notification Inbox" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <div
                  className={
                    selectedNotificationId === null
                      ? ""
                      : "grid gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(20rem,24rem)] xl:items-start"
                  }
                >
                  <NotificationTable
                    notifications={notificationsQuery.data ?? []}
                    isLoading={notificationsQuery.isLoading}
                    error={notificationsQuery.error}
                    selectedNotificationId={selectedNotificationId}
                    onSelectNotification={setSelectedNotification}
                  />
                  {selectedNotification ? (
                    <div className="space-y-4">
                      <div className="flex h-9 items-center justify-between gap-2">
                        <h2 className="text-base font-semibold">
                          Notification Details
                        </h2>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="size-7"
                          onClick={() => setSelectedNotification(null)}
                        >
                          <X className="size-4" />
                          <span className="sr-only">
                            Close notification details
                          </span>
                        </Button>
                      </div>
                      <NotificationDetailsPanel
                        notification={selectedNotification}
                      />
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
