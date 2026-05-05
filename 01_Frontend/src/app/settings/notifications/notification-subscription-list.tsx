import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatSecondsToHoursMinutesSeconds, labelToTitleCase } from "@/lib/detail-formatters";
import {
  supportsDeviceSelection,
  type DeviceSummary,
  type Subscription,
  type SubscriptionType,
  type ThresholdConfig,
} from "@/lib/api";

type NotificationSubscriptionListProps = {
  subscriptions: Subscription[];
  availableDevices: DeviceSummary[];
  isPending: boolean;
  onUnsubscribe: (subscriptionId: number) => void;
};

function getNumericUnit(type: SubscriptionType): string {
  if (type === "temperature") return "C";
  if (type === "humidity") return "%";
  if (type === "lightIntensity") return "lux";
  if (type === "noiseLevel") return "dB";
  return "";
}

function formatThresholdConfig(
  thresholdConfig: ThresholdConfig,
  type: SubscriptionType,
): string | null {
  if (!thresholdConfig) {
    return null;
  }

  if (thresholdConfig.category === "eventNumeric") {
    return `Outside ${thresholdConfig.min}-${thresholdConfig.max} ${getNumericUnit(type)}`.trim();
  }

  if (thresholdConfig.category === "stateGeoRadius") {
    return `House boundary: ${thresholdConfig.radiusMeters} m around ${thresholdConfig.lat}, ${thresholdConfig.lng}`;
  }

  if (thresholdConfig.category === "fallDetection") {
    return `Acceleration above ${thresholdConfig.minImpactG} g and no room change for ${thresholdConfig.noRoomChangeDelaySeconds} s`;
  }

  if (thresholdConfig.category === "noiseLevelDuration") {
    return `Noise above ${thresholdConfig.minDb} dB for more than ${thresholdConfig.durationSeconds} s`;
  }

  if (thresholdConfig.category === "indoorBeaconDuration") {
    return `Same room for more than ${formatSecondsToHoursMinutesSeconds(thresholdConfig.durationSeconds)} between ${thresholdConfig.startTime}-${thresholdConfig.endTime}`;
  }

  return `${thresholdConfig.status} for more than ${formatSecondsToHoursMinutesSeconds(thresholdConfig.durationSeconds)}`;
}

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
                  {subscription.detailLevel === "none"
                    ? "Generic alert"
                    : labelToTitleCase(subscription.detailLevel)}
                </Badge>
                <Badge variant="outline">
                  {labelToTitleCase(subscription.deliveryMethod)}
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
