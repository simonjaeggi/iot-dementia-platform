import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  supportsDeviceSelection,
  type CreateSubscription,
  type DeliveryMethod,
  type DetailLevel,
  type DeviceSummary,
  type Subscription,
  type SubscriptionType,
  type ThresholdConfig,
} from "@/lib/api";
import { NotificationSubscriptionList } from "./notification-subscription-list";

const ALL_DEVICES_VALUE = "__all_devices__";

export type NotificationCardProps = {
  subscriptions: Subscription[];
  availableDevices: DeviceSummary[];
  isPending: boolean;
  isDeviceListLoading: boolean;
  isDeviceListError: boolean;
  onSubscribe: (input: CreateSubscription) => void;
  onUnsubscribe: (subscriptionId: number) => void;
};

type SubscriptionCardShellProps = NotificationCardProps & {
  type: SubscriptionType;
  title: string;
  thresholdConfig: ThresholdConfig;
  children?: ReactNode;
};

export function SubscriptionCardShell({
  type,
  title,
  subscriptions,
  availableDevices,
  thresholdConfig,
  isPending,
  isDeviceListLoading,
  isDeviceListError,
  onSubscribe,
  onUnsubscribe,
  children,
}: SubscriptionCardShellProps) {
  const [detailLevel, setDetailLevel] = useState<DetailLevel>("none");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("email");
  const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(null);
  const canSelectDevice = supportsDeviceSelection(type);

  const selectedPairExists = subscriptions.some(
    (subscription) =>
      subscription.detailLevel === detailLevel &&
      subscription.deliveryMethod === deliveryMethod &&
      (subscription.deviceCertFingerprintSha256 ?? null) === deviceFingerprint,
  );

  return (
    <div className="bg-background flex h-full flex-col gap-4 rounded-lg border p-4 shadow-xs">
      <div className="text-base font-medium">{title}</div>

      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium text-muted-foreground">
          Existing subscriptions
        </div>
        <NotificationSubscriptionList
          subscriptions={subscriptions}
          availableDevices={availableDevices}
          isPending={isPending}
          onUnsubscribe={onUnsubscribe}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium text-muted-foreground">
          Detail level
        </div>
        <Select
          value={detailLevel}
          onValueChange={(value: DetailLevel) => setDetailLevel(value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select detail level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Generic alert</SelectItem>
            <SelectItem value="title">Title only</SelectItem>
            <SelectItem value="full">Full details</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium text-muted-foreground">Delivery</div>
        <Select
          value={deliveryMethod}
          onValueChange={(value: DeliveryMethod) => setDeliveryMethod(value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select delivery method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="push">Push</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {canSelectDevice ? (
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium text-muted-foreground">Device</div>
          <Select
            value={deviceFingerprint ?? ALL_DEVICES_VALUE}
            onValueChange={(value) =>
              setDeviceFingerprint(value === ALL_DEVICES_VALUE ? null : value)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select device" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_DEVICES_VALUE}>All devices</SelectItem>
              {availableDevices.map((device) => (
                <SelectItem
                  key={device.certFingerprintSha256}
                  value={device.certFingerprintSha256}
                >
                  {device.name?.trim() || "Unnamed device"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground">
            {isDeviceListError
              ? "Failed to load devices. Leave this on all devices for now."
              : isDeviceListLoading
                ? "Loading devices. You can still subscribe for all devices."
                : "Limit this subscription to one device or leave it on all devices."}
          </div>
        </div>
      ) : null}

      {children}

      <div className="mt-auto flex items-center justify-end">
        <Button
          size="sm"
          onClick={() =>
            onSubscribe({
              type,
              deviceFingerprint,
              detailLevel,
              deliveryMethod,
              thresholdConfig,
            })
          }
          disabled={selectedPairExists || isPending}
        >
          {selectedPairExists ? "Already added" : "Subscribe"}
        </Button>
      </div>
    </div>
  );
}
