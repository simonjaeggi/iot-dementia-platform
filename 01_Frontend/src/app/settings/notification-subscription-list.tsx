import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatThresholdConfig,
  getDeliveryMethodLabel,
  getDetailLevelLabel,
  supportsDeviceSelection,
} from "./settings.config";
import type { DeviceSummary, Subscription } from "./settings.config";

type NotificationSubscriptionListProps = {
  subscriptions: Subscription[];
  availableDevices: DeviceSummary[];
  isPending: boolean;
  onUnsubscribe: (subscriptionId: number) => void;
};

export function NotificationSubscriptionList({
  subscriptions,
  availableDevices,
  isPending,
  onUnsubscribe,
}: NotificationSubscriptionListProps) {
  if (subscriptions.length === 0) {
    return (
      <div className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
        No subscriptions yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {subscriptions.map((subscription) => {
        const thresholdSummary = formatThresholdConfig(
          subscription.thresholdConfig,
          subscription.type,
        );
        const scopedDevice = availableDevices.find(
          (device) =>
            device.certFingerprintSha256 ===
            subscription.deviceCertFingerprintSha256,
        );
        const deviceScopeLabel = !supportsDeviceSelection(subscription.type)
          ? null
          : subscription.deviceCertFingerprintSha256 === null
            ? "All devices"
            : scopedDevice?.name?.trim() ||
              `${subscription.deviceCertFingerprintSha256.slice(0, 8)}...${subscription.deviceCertFingerprintSha256.slice(-6)}`;

        return (
          <div
            key={subscription.id}
            className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
          >
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary">
                  {getDetailLevelLabel(subscription.detailLevel)}
                </Badge>
                <Badge variant="outline">
                  {getDeliveryMethodLabel(subscription.deliveryMethod)}
                </Badge>
                {deviceScopeLabel ? (
                  <Badge variant="outline">{deviceScopeLabel}</Badge>
                ) : null}
              </div>
              {thresholdSummary ? (
                <div className="text-xs text-muted-foreground">
                  {thresholdSummary}
                </div>
              ) : null}
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onUnsubscribe(subscription.id)}
              disabled={isPending}
            >
              Unsubscribe
            </Button>
          </div>
        );
      })}
    </div>
  );
}
