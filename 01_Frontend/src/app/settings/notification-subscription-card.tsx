import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DETAIL_LEVEL_OPTIONS,
  getNumericSliderValue,
} from "./settings.config";
import type {
  DeviceSummary,
  DeliveryMethod,
  DetailLevel,
  SubscriptionTypeOption,
  NumericThresholdDraft,
  OutdoorLocationThresholdDraft,
  StateDurationThresholdDraft,
  Subscription,
} from "./settings.config";
import { NotificationSubscriptionList } from "./notification-subscription-list";

type NotificationSubscriptionCardProps = {
  subscriptionType: SubscriptionTypeOption;
  eventSubscriptions: Subscription[];
  availableDevices: DeviceSummary[];
  selectedDetailLevel: DetailLevel;
  selectedDeliveryMethod: DeliveryMethod;
  selectedDeviceFingerprint: string | null;
  numericThresholdDraft: NumericThresholdDraft;
  outdoorLocationThresholdDraft: OutdoorLocationThresholdDraft;
  stateDurationThresholdDraft: StateDurationThresholdDraft;
  selectedPairExists: boolean;
  supportsDeviceSelection: boolean;
  isPending: boolean;
  isDeviceListLoading: boolean;
  isDeviceListError: boolean;
  onDetailLevelChange: (detailLevel: DetailLevel) => void;
  onDeliveryMethodChange: (deliveryMethod: DeliveryMethod) => void;
  onDeviceFingerprintChange: (deviceFingerprint: string | null) => void;
  onNumericThresholdChange: (thresholdDraft: NumericThresholdDraft) => void;
  onClearNumericThreshold: () => void;
  onOutdoorLocationThresholdChange: (
    field: keyof OutdoorLocationThresholdDraft,
    value: string,
  ) => void;
  onStateDurationThresholdChange: (thresholdDraft: StateDurationThresholdDraft) => void;
  onSubscribe: () => void;
  onUnsubscribe: (subscriptionId: number) => void;
};

export function NotificationSubscriptionCard({
  subscriptionType,
  eventSubscriptions,
  availableDevices,
  selectedDetailLevel,
  selectedDeliveryMethod,
  selectedDeviceFingerprint,
  numericThresholdDraft,
  outdoorLocationThresholdDraft,
  stateDurationThresholdDraft,
  selectedPairExists,
  supportsDeviceSelection,
  isPending,
  isDeviceListLoading,
  isDeviceListError,
  onDetailLevelChange,
  onDeliveryMethodChange,
  onDeviceFingerprintChange,
  onNumericThresholdChange,
  onClearNumericThreshold,
  onOutdoorLocationThresholdChange,
  onStateDurationThresholdChange,
  onSubscribe,
  onUnsubscribe,
}: NotificationSubscriptionCardProps) {
  const hasNumericThreshold =
    numericThresholdDraft.min.trim() !== "" && numericThresholdDraft.max.trim() !== "";
  const allDevicesValue = "__all_devices__";

  const handleNumericThresholdSliderChange = (values: number[]) => {
    const [min, max] = values;

    if (min === undefined || max === undefined) {
      return;
    }

    onNumericThresholdChange({
      min: String(min),
      max: String(max),
    });
  };

  const formatDeviceLabel = (device: DeviceSummary) => {
    const shortenedFingerprint =
      `${device.certFingerprintSha256.slice(0, 8)}...${device.certFingerprintSha256.slice(-6)}`;

    if (!device.name?.trim()) {
      return shortenedFingerprint;
    }

    return `${device.name.trim()} (${shortenedFingerprint})`;
  };

  return (
    <div className="bg-background flex h-full flex-col gap-4 rounded-lg border p-4 shadow-xs">
      <div className="text-base font-medium">{subscriptionType.label}</div>

      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium text-muted-foreground">
          Existing subscriptions
        </div>
        <NotificationSubscriptionList
          subscriptions={eventSubscriptions}
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
          value={selectedDetailLevel}
          onValueChange={(value: DetailLevel) => onDetailLevelChange(value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select detail level" />
          </SelectTrigger>
          <SelectContent>
            {DETAIL_LEVEL_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium text-muted-foreground">
          Delivery
        </div>
        <Select
          value={selectedDeliveryMethod}
          onValueChange={(value: DeliveryMethod) => onDeliveryMethodChange(value)}
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

      {supportsDeviceSelection ? (
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium text-muted-foreground">
            Device
          </div>
          <Select
            value={selectedDeviceFingerprint ?? allDevicesValue}
            onValueChange={(value) =>
              onDeviceFingerprintChange(
                value === allDevicesValue ? null : value,
              )
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select device" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={allDevicesValue}>All devices</SelectItem>
              {availableDevices.map((device) => (
                <SelectItem
                  key={device.certFingerprintSha256}
                  value={device.certFingerprintSha256}
                >
                  {formatDeviceLabel(device)}
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

      {subscriptionType.threshold.category === "eventNumeric" ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-medium text-muted-foreground">
              Normal range
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-auto px-0 text-xs text-muted-foreground"
              onClick={onClearNumericThreshold}
            >
              Reset
            </Button>
          </div>
          <div className="rounded-md border px-3 py-4">
            <Slider
              min={subscriptionType.threshold.sliderMin}
              max={subscriptionType.threshold.sliderMax}
              step={subscriptionType.threshold.step}
              value={getNumericSliderValue(subscriptionType.id, numericThresholdDraft)}
              minStepsBetweenThumbs={1}
              onValueChange={handleNumericThresholdSliderChange}
            />
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {numericThresholdDraft.min || subscriptionType.threshold.sliderMin}{" "}
                {subscriptionType.threshold.unit}
              </span>
              <span>
                {numericThresholdDraft.max || subscriptionType.threshold.sliderMax}{" "}
                {subscriptionType.threshold.unit}
              </span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {hasNumericThreshold
              ? `Alerts are sent when ${subscriptionType.label.toLowerCase()} leaves this range.`
              : `No range filter yet. Move the slider to alert when ${subscriptionType.label.toLowerCase()} leaves a normal range.`}
          </div>
        </div>
      ) : null}

      {subscriptionType.threshold.category === "stateGeoRadius" ? (
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium text-muted-foreground">
            Geofence
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <Input
              type="number"
              step="any"
              placeholder="Latitude"
              value={outdoorLocationThresholdDraft.lat}
              onChange={(event) =>
                onOutdoorLocationThresholdChange("lat", event.target.value)
              }
            />
            <Input
              type="number"
              step="any"
              placeholder="Longitude"
              value={outdoorLocationThresholdDraft.lng}
              onChange={(event) =>
                onOutdoorLocationThresholdChange("lng", event.target.value)
              }
            />
          </div>
          <Input
            type="number"
            min="10.01"
            step="any"
            placeholder="Radius in meters"
            value={outdoorLocationThresholdDraft.radiusMeters}
            onChange={(event) =>
              onOutdoorLocationThresholdChange("radiusMeters", event.target.value)
            }
          />
          <div className="text-xs text-muted-foreground">
            Alerts are sent once when the person crosses this boundary. Radius must be greater than 10 meters.
          </div>
        </div>
      ) : null}

      {subscriptionType.threshold.category === "stateDuration" ? (
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium text-muted-foreground">
            Timeout condition
          </div>
          <Select
            value={stateDurationThresholdDraft.status}
            onValueChange={(value: "open" | "closed") =>
              onStateDurationThresholdChange({
                ...stateDurationThresholdDraft,
                status: value,
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            min="1"
            step="1"
            placeholder="Duration in seconds"
            value={stateDurationThresholdDraft.durationSeconds}
            onChange={(event) =>
              onStateDurationThresholdChange({
                ...stateDurationThresholdDraft,
                durationSeconds: event.target.value,
              })
            }
          />
          <div className="text-xs text-muted-foreground">
            Alerts are sent when infrastructure remains in the selected state for longer than this duration.
          </div>
        </div>
      ) : null}

      <div className="mt-auto flex items-center justify-end">
        <Button size="sm" onClick={onSubscribe} disabled={selectedPairExists || isPending}>
          {selectedPairExists ? "Already added" : "Subscribe"}
        </Button>
      </div>
    </div>
  );
}
