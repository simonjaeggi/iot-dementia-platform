import type { SubscriptionType } from "@/lib/api";
import {
  SubscriptionCardShell,
  type NotificationCardProps,
} from "../subscription-card-shell";

function SimpleNotificationCard({
  type,
  title,
  ...props
}: NotificationCardProps & { type: SubscriptionType; title: string }) {
  return (
    <SubscriptionCardShell
      {...props}
      type={type}
      title={title}
      thresholdConfig={null}
    />
  );
}

export function LoginNotificationCard(props: NotificationCardProps) {
  return <SimpleNotificationCard {...props} type="login" title="Login" />;
}

export function RegisterNotificationCard(props: NotificationCardProps) {
  return <SimpleNotificationCard {...props} type="register" title="Register" />;
}

export function RoleChangeNotificationCard(props: NotificationCardProps) {
  return (
    <SimpleNotificationCard {...props} type="roleChange" title="Role change" />
  );
}

export function UserDeleteNotificationCard(props: NotificationCardProps) {
  return (
    <SimpleNotificationCard {...props} type="userDelete" title="User delete" />
  );
}

export function AccessCodeNotificationCard(props: NotificationCardProps) {
  return (
    <SimpleNotificationCard {...props} type="accessCode" title="Access code" />
  );
}
