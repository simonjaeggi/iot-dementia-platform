import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDateTime } from "@/lib/detail-formatters";
import type { InboxNotification } from "@/lib/api";

export function NotificationDetailsPanel({
  notification,
}: {
  notification: InboxNotification;
}) {
  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-xl">{notification.title}</CardTitle>
          <Badge variant={notification.readAt ? "outline" : "secondary"}>
            {notification.readAt ? "Read" : "Unread"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Created</dt>
            <dd className="mt-1 font-medium">
              {formatDateTime(notification.createdAt.toISOString())}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Read</dt>
            <dd className="mt-1 font-medium">
              {notification.readAt
                ? formatDateTime(notification.readAt.toISOString())
                : "Not read yet"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Notification ID</dt>
            <dd className="mt-1 font-medium">{notification.id}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Trigger event</dt>
            <dd className="mt-1 font-medium">
              {notification.triggerEventId ?? "-"}
            </dd>
          </div>
        </dl>

        <Separator />

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Message</h3>
          <p className="whitespace-pre-wrap text-sm leading-6">
            {notification.message}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
