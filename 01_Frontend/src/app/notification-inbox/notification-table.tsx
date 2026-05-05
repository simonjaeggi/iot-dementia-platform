import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAxiosErrorMessage, type InboxNotification } from "@/lib/api";
import { formatDateTime } from "@/lib/detail-formatters";

const COLUMN_COUNT = 4;

export function NotificationTable({
  notifications,
  isLoading,
  error,
  selectedNotificationId,
  onSelectNotification,
  filterValue,
  onFilterValueChange,
  toolbarActions,
}: {
  notifications: InboxNotification[];
  isLoading: boolean;
  error: unknown;
  selectedNotificationId?: number | null;
  onSelectNotification?: (notificationId: number) => void;
  filterValue: string;
  onFilterValueChange: (value: string) => void;
  toolbarActions?: ReactNode;
}) {
  const errorMessage = getAxiosErrorMessage(
    error,
    "Failed to load notifications.",
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          placeholder="Filter notifications..."
          value={filterValue}
          onChange={(event) => onFilterValueChange(event.target.value)}
          maxLength={200}
          className="w-full md:max-w-sm"
        />
        {toolbarActions ? (
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            {toolbarActions}
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT}>
                  Loading notifications...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT}>{errorMessage}</TableCell>
              </TableRow>
            ) : notifications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT}>
                  {filterValue.trim()
                    ? "No notifications match the filter."
                    : "No notifications found."}
                </TableCell>
              </TableRow>
            ) : (
              notifications.map((notification) => (
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
                  <TableCell className="min-w-40 font-medium">
                    {formatDateTime(notification.createdAt.toISOString())}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={notification.readAt ? "outline" : "secondary"}
                    >
                      {notification.readAt ? "Read" : "Unread"}
                    </Badge>
                  </TableCell>
                  <TableCell className="min-w-40 font-medium">
                    {notification.title}
                  </TableCell>
                  <TableCell
                    className="text-muted-foreground max-w-[36rem] truncate"
                    title={notification.message}
                  >
                    {notification.message}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
