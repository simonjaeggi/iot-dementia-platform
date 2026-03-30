import { Separator } from "@/components/ui/separator";
import { NotificationSubscriptionCard } from "./notification-subscription-card";
import {
  getSubscriptionTypesForGroup,
  getNumericThresholdDraft,
  getOutdoorLocationThresholdDraft,
  getStateDurationThresholdDraft,
  getSelectedDeviceFingerprint,
  getSelectedDeliveryMethod,
  getSelectedDetailLevel,
  hasSelectedSubscription,
  supportsDeviceSelection,
} from "./settings.config";
import type {
  DeviceSelectionsByType,
  DeviceSummary,
  DeliveryMethod,
  DeliveryMethodsByType,
  DetailLevel,
  DetailLevelsByType,
  EventGroup,
  NumericThresholdDraft,
  NumericThresholdsByType,
  OutdoorLocationThresholdDraft,
  GeoRadiusThresholdsByType,
  StateDurationThresholdDraft,
  StateDurationThresholdsByType,
  SubscriptionType,
  SubscriptionsByType,
} from "./settings.config";

type NotificationSubscriptionSectionProps = {
  group: EventGroup;
  showSeparator: boolean;
  subscriptionsByType: SubscriptionsByType;
  availableDevices: DeviceSummary[];
  deviceSelectionsByType: DeviceSelectionsByType;
  detailLevelsByType: DetailLevelsByType;
  deliveryMethodsByType: DeliveryMethodsByType;
  numericThresholdsByType: NumericThresholdsByType;
  geoRadiusThresholdsByType: GeoRadiusThresholdsByType;
  stateDurationThresholdsByType: StateDurationThresholdsByType;
  isPending: boolean;
  isDeviceListLoading: boolean;
  isDeviceListError: boolean;
  onDetailLevelChange: (type: SubscriptionType, detailLevel: DetailLevel) => void;
  onDeliveryMethodChange: (
    type: SubscriptionType,
    deliveryMethod: DeliveryMethod,
  ) => void;
  onDeviceFingerprintChange: (
    type: SubscriptionType,
    deviceFingerprint: string | null,
  ) => void;
  onNumericThresholdChange: (
    type: SubscriptionType,
    thresholdDraft: NumericThresholdDraft,
  ) => void;
  onClearNumericThreshold: (type: SubscriptionType) => void;
  onOutdoorLocationThresholdChange: (
    type: SubscriptionType,
    field: keyof OutdoorLocationThresholdDraft,
    value: string,
  ) => void;
  onStateDurationThresholdChange: (
    type: SubscriptionType,
    thresholdDraft: StateDurationThresholdDraft,
  ) => void;
  onSubscribe: (type: SubscriptionType) => void;
  onUnsubscribe: (subscriptionId: number) => void;
};

export function NotificationSubscriptionSection({
  group,
  showSeparator,
  subscriptionsByType,
  availableDevices,
  deviceSelectionsByType,
  detailLevelsByType,
  deliveryMethodsByType,
  numericThresholdsByType,
  geoRadiusThresholdsByType,
  stateDurationThresholdsByType,
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
}: NotificationSubscriptionSectionProps) {
  const subscriptionTypes = getSubscriptionTypesForGroup(group);

  return (
    <section className="flex flex-col gap-4">
      {showSeparator ? <Separator /> : null}
      <div className="text-sm font-semibold tracking-wide text-foreground">
        {group}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {subscriptionTypes.map((subscriptionType) => {
          const subscriptions = subscriptionsByType[subscriptionType.id] ?? [];
          const selectedDetailLevel = getSelectedDetailLevel(
            detailLevelsByType,
            subscriptionType.id,
          );
          const selectedDeliveryMethod = getSelectedDeliveryMethod(
            deliveryMethodsByType,
            subscriptionType.id,
          );
          const selectedDeviceFingerprint = getSelectedDeviceFingerprint(
            deviceSelectionsByType,
            subscriptionType.id,
          );

          return (
            <NotificationSubscriptionCard
              key={subscriptionType.id}
              subscriptionType={subscriptionType}
              eventSubscriptions={subscriptions}
              availableDevices={availableDevices}
              selectedDetailLevel={selectedDetailLevel}
              selectedDeliveryMethod={selectedDeliveryMethod}
              selectedDeviceFingerprint={selectedDeviceFingerprint}
              numericThresholdDraft={getNumericThresholdDraft(
                numericThresholdsByType,
                subscriptionType.id,
              )}
              outdoorLocationThresholdDraft={getOutdoorLocationThresholdDraft(
                geoRadiusThresholdsByType,
                subscriptionType.id,
              )}
              stateDurationThresholdDraft={getStateDurationThresholdDraft(
                stateDurationThresholdsByType,
                subscriptionType.id,
              )}
              selectedPairExists={hasSelectedSubscription(
                subscriptions,
                selectedDetailLevel,
                selectedDeliveryMethod,
                selectedDeviceFingerprint,
              )}
              supportsDeviceSelection={supportsDeviceSelection(subscriptionType.id)}
              isPending={isPending}
              isDeviceListLoading={isDeviceListLoading}
              isDeviceListError={isDeviceListError}
              onDetailLevelChange={(detailLevel) =>
                onDetailLevelChange(subscriptionType.id, detailLevel)
              }
              onDeliveryMethodChange={(deliveryMethod) =>
                onDeliveryMethodChange(subscriptionType.id, deliveryMethod)
              }
              onDeviceFingerprintChange={(deviceFingerprint) =>
                onDeviceFingerprintChange(subscriptionType.id, deviceFingerprint)
              }
              onNumericThresholdChange={(thresholdDraft) =>
                onNumericThresholdChange(subscriptionType.id, thresholdDraft)
              }
              onClearNumericThreshold={() =>
                onClearNumericThreshold(subscriptionType.id)
              }
              onOutdoorLocationThresholdChange={(field, value) =>
                onOutdoorLocationThresholdChange(subscriptionType.id, field, value)
              }
              onStateDurationThresholdChange={(thresholdDraft) =>
                onStateDurationThresholdChange(subscriptionType.id, thresholdDraft)
              }
              onSubscribe={() => onSubscribe(subscriptionType.id)}
              onUnsubscribe={onUnsubscribe}
            />
          );
        })}
      </div>
    </section>
  )
}
