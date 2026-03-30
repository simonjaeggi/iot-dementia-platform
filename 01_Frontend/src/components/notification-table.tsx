import { useMemo, useState } from "react";
import { z } from "zod";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAxiosErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/detail-formatters";

export const InboxNotificationSchema = z.object({
  id: z.number().int().positive(),
  createdAt: z.coerce.date(),
  userId: z.number().int().positive(),
  triggerEventId: z.number().int().positive().nullable(),
  title: z.string(),
  message: z.string(),
  readAt: z.coerce.date().nullable(),
});

export const InboxNotificationsResponseSchema = z.object({
  notifications: z.array(InboxNotificationSchema),
});

export type InboxNotification = z.infer<typeof InboxNotificationSchema>;

type NotificationColumnId =
  | "createdAt"
  | "status"
  | "title"
  | "message"
  | "triggerEventId";

export function NotificationTable({
  notifications,
  isLoading,
  error,
  selectedNotificationId,
  onSelectNotification,
}: {
  notifications: InboxNotification[];
  isLoading: boolean;
  error: unknown;
  selectedNotificationId?: number | null;
  onSelectNotification?: (notificationId: number) => void;
}) {
  const [filterValue, setFilterValue] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<
    Record<NotificationColumnId, boolean>
  >({
    createdAt: true,
    status: true,
    title: true,
    message: true,
    triggerEventId: false,
  });

  const filteredNotifications = useMemo(() => {
    const query = filterValue.trim().toLowerCase();

    if (!query) {
      return notifications;
    }

    return notifications.filter((notification) =>
      [
        notification.id,
        notification.title,
        notification.message,
        notification.triggerEventId ?? "",
        notification.readAt ? "read" : "unread",
        formatDateTime(notification.createdAt.toISOString()),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [filterValue, notifications]);

  const visibleColumnCount = Math.max(
    Object.values(columnVisibility).filter(Boolean).length,
    1,
  );
  const errorMessage = getAxiosErrorMessage(
    error,
    "Failed to load notifications.",
  );

  function toggleColumn(column: NotificationColumnId, visible: boolean) {
    setColumnVisibility((current) => ({
      ...current,
      [column]: visible,
    }));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          placeholder="Filter notifications..."
          value={filterValue}
          onChange={(event) => setFilterValue(event.target.value)}
          className="w-full md:max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full md:w-auto">
              Columns
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={columnVisibility.createdAt}
              onCheckedChange={(value) =>
                toggleColumn("createdAt", Boolean(value))
              }
            >
              Created
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.status}
              onCheckedChange={(value) => toggleColumn("status", Boolean(value))}
            >
              Status
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.title}
              onCheckedChange={(value) => toggleColumn("title", Boolean(value))}
            >
              Title
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.message}
              onCheckedChange={(value) => toggleColumn("message", Boolean(value))}
            >
              Message
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.triggerEventId}
              onCheckedChange={(value) =>
                toggleColumn("triggerEventId", Boolean(value))
              }
            >
              Trigger event
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {columnVisibility.createdAt ? <TableHead>Created</TableHead> : null}
              {columnVisibility.status ? <TableHead>Status</TableHead> : null}
              {columnVisibility.title ? <TableHead>Title</TableHead> : null}
              {columnVisibility.message ? <TableHead>Message</TableHead> : null}
              {columnVisibility.triggerEventId ? (
                <TableHead>Trigger event</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={visibleColumnCount}>
                  Loading notifications...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={visibleColumnCount}>{errorMessage}</TableCell>
              </TableRow>
            ) : filteredNotifications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumnCount}>
                  No notifications found.
                </TableCell>
              </TableRow>
            ) : (
              filteredNotifications.map((notification) => (
                <TableRow
                  key={notification.id}
                  data-state={
                    notification.id === selectedNotificationId
                      ? "selected"
                      : undefined
                  }
                  className={onSelectNotification ? "cursor-pointer" : undefined}
                  onClick={() => onSelectNotification?.(notification.id)}
                >
                  {columnVisibility.createdAt ? (
                    <TableCell className="min-w-40 font-medium">
                      {formatDateTime(notification.createdAt.toISOString())}
                    </TableCell>
                  ) : null}
                  {columnVisibility.status ? (
                    <TableCell>
                      <Badge
                        variant={notification.readAt ? "outline" : "secondary"}
                      >
                        {notification.readAt ? "Read" : "Unread"}
                      </Badge>
                    </TableCell>
                  ) : null}
                  {columnVisibility.title ? (
                    <TableCell className="min-w-40 font-medium">
                      {notification.title}
                    </TableCell>
                  ) : null}
                  {columnVisibility.message ? (
                    <TableCell
                      className="text-muted-foreground max-w-[36rem] truncate"
                      title={notification.message}
                    >
                      {notification.message}
                    </TableCell>
                  ) : null}
                  {columnVisibility.triggerEventId ? (
                    <TableCell className="font-mono text-xs">
                      {notification.triggerEventId ?? "-"}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
