import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { PageLayout } from "@/components/page-layout";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  axiosInstance,
  CreateSubscriptionSchema,
  DevicesResponseSchema,
  endpoints,
  getAxiosErrorMessage,
  SubscriptionIdSchema,
  SubscriptionResponseSchema,
  SubscriptionsResponseSchema,
  type CreateSubscription,
  type Subscription,
  type SubscriptionType,
} from "@/lib/api";
import {
  AccessCodeNotificationCard,
  CorruptDeviceConfigNotificationCard,
  FallDetectionNotificationCard,
  HumidityNotificationCard,
  InfrastructureStatusNotificationCard,
  LightIntensityNotificationCard,
  LoginNotificationCard,
  NoiseLevelNotificationCard,
  OutdoorGeofenceNotificationCard,
  PanicDetectionNotificationCard,
  PasswordChangeNotificationCard,
  RegisterNotificationCard,
  RoleChangeNotificationCard,
  SameRoomTooLongNotificationCard,
  SystemBootNotificationCard,
  TemperatureNotificationCard,
  UpdateAvailableNotificationCard,
} from "./notification-cards/notification-cards";

const ENVIRONMENT_TAB = "environment";
const LOCATION_TAB = "location";
const SYSTEM_TAB = "system";
const USER_ACTIVITY_TAB = "user-activity";

export function Notifications() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const rawTab = searchParams.get("notificationsTab") ?? "";
  const activeTab =
    rawTab === LOCATION_TAB ||
    rawTab === SYSTEM_TAB ||
    rawTab === USER_ACTIVITY_TAB
      ? rawTab
      : ENVIRONMENT_TAB;

  function setActiveTab(value: string) {
    const next = new URLSearchParams(searchParams);

    if (value === ENVIRONMENT_TAB) {
      next.delete("notificationsTab");
    } else {
      next.set("notificationsTab", value);
    }

    setSearchParams(next, { replace: true });
  }

  const subscriptionsQuery = useQuery({
    queryKey: ["notification-subscriptions"],
    queryFn: async () => {
      const response = await axiosInstance.get(
        endpoints.notification.subscriptions,
      );
      return SubscriptionsResponseSchema.parse(response.data).subscriptions;
    },
    retry: false,
  });

  const devicesQuery = useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      const response = await axiosInstance.get(endpoints.device.list);
      return DevicesResponseSchema.parse(response.data).devices;
    },
    retry: false,
  });

  const invalidateSubscriptions = () =>
    queryClient.invalidateQueries({ queryKey: ["notification-subscriptions"] });

  const subscribeMutation = useMutation({
    mutationFn: async (input: CreateSubscription) => {
      const response = await axiosInstance.post(
        endpoints.notification.subscriptions,
        input,
      );
      return SubscriptionResponseSchema.parse(response.data).subscription;
    },
    onSuccess: () => {
      toast.success("Subscription created successfully.");
      invalidateSubscriptions();
    },
    onError: (error) =>
      toast.error(
        getAxiosErrorMessage(
          error,
          "Failed to create notification subscription.",
        ),
      ),
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async (subscriptionId: number) => {
      const id = SubscriptionIdSchema.parse(subscriptionId);
      await axiosInstance.delete(`/api/notification/subscriptions/${id}`);
    },
    onSuccess: () => {
      toast.success("Subscription removed successfully.");
      invalidateSubscriptions();
    },
    onError: (error) =>
      toast.error(
        getAxiosErrorMessage(
          error,
          "Failed to remove notification subscription.",
        ),
      ),
  });

  function handleSubscribe(input: CreateSubscription) {
    const result = CreateSubscriptionSchema.safeParse(input);

    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? "Invalid subscription.");
      return;
    }

    subscribeMutation.mutate(result.data);
  }

  function handleUnsubscribe(subscriptionId: number) {
    const result = SubscriptionIdSchema.safeParse(subscriptionId);

    if (!result.success) {
      toast.error("Invalid subscription.");
      return;
    }

    unsubscribeMutation.mutate(result.data);
  }

  function getSubscriptions(type: SubscriptionType): Subscription[] {
    return (
      subscriptionsQuery.data?.filter(
        (subscription) => subscription.type === type,
      ) ?? []
    );
  }

  const sharedProps = {
    availableDevices: devicesQuery.data ?? [],
    isPending: subscribeMutation.isPending || unsubscribeMutation.isPending,
    isDeviceListLoading: devicesQuery.isLoading,
    isDeviceListError: devicesQuery.isError,
    onSubscribe: handleSubscribe,
    onUnsubscribe: handleUnsubscribe,
  };

  return (
    <PageLayout
      title="Notification Subscriptions"
      contentClassName="flex flex-col gap-4"
    >
      <p className="text-muted-foreground text-sm">
        Choose which event types should create notifications.
      </p>

      {subscriptionsQuery.isLoading ? (
        <div className="text-sm text-muted-foreground">
          Loading subscriptions...
        </div>
      ) : null}
      {subscriptionsQuery.isError ? (
        <div className="text-sm text-destructive">
          Failed to load subscriptions.
        </div>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value={ENVIRONMENT_TAB}>Environment</TabsTrigger>
          <TabsTrigger value={LOCATION_TAB}>Location</TabsTrigger>
          <TabsTrigger value={SYSTEM_TAB}>System</TabsTrigger>
          <TabsTrigger value={USER_ACTIVITY_TAB}>User activity</TabsTrigger>
        </TabsList>

        <TabsContent value={ENVIRONMENT_TAB}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <TemperatureNotificationCard
              {...sharedProps}
              subscriptions={getSubscriptions("temperature")}
            />
            <HumidityNotificationCard
              {...sharedProps}
              subscriptions={getSubscriptions("humidity")}
            />
            <LightIntensityNotificationCard
              {...sharedProps}
              subscriptions={getSubscriptions("lightIntensity")}
            />
            <NoiseLevelNotificationCard
              {...sharedProps}
              subscriptions={getSubscriptions("noiseLevel")}
            />
            <PanicDetectionNotificationCard
              {...sharedProps}
              subscriptions={getSubscriptions("panicDetection")}
            />
          </div>
        </TabsContent>

        <TabsContent value={LOCATION_TAB}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <OutdoorGeofenceNotificationCard
              {...sharedProps}
              subscriptions={getSubscriptions("outdoorGeofenceCrossed")}
            />
            <FallDetectionNotificationCard
              {...sharedProps}
              subscriptions={getSubscriptions("fallDetection")}
            />
            <SameRoomTooLongNotificationCard
              {...sharedProps}
              subscriptions={getSubscriptions("sameRoomTooLong")}
            />
          </div>
        </TabsContent>

        <TabsContent value={SYSTEM_TAB}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <InfrastructureStatusNotificationCard
              {...sharedProps}
              subscriptions={getSubscriptions("infrastructureStatusTooLong")}
            />
            <CorruptDeviceConfigNotificationCard
              {...sharedProps}
              subscriptions={getSubscriptions("corruptDeviceConfig")}
            />
            <UpdateAvailableNotificationCard
              {...sharedProps}
              subscriptions={getSubscriptions("updateAvailable")}
            />
            <SystemBootNotificationCard
              {...sharedProps}
              subscriptions={getSubscriptions("systemBoot")}
            />
          </div>
        </TabsContent>

        <TabsContent value={USER_ACTIVITY_TAB}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <LoginNotificationCard
              {...sharedProps}
              subscriptions={getSubscriptions("login")}
            />
            <RegisterNotificationCard
              {...sharedProps}
              subscriptions={getSubscriptions("register")}
            />
            <PasswordChangeNotificationCard
              {...sharedProps}
              subscriptions={getSubscriptions("passwordChange")}
            />
            <RoleChangeNotificationCard
              {...sharedProps}
              subscriptions={getSubscriptions("roleChange")}
            />
            <AccessCodeNotificationCard
              {...sharedProps}
              subscriptions={getSubscriptions("accessCode")}
            />
          </div>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
