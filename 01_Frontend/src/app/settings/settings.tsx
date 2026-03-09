import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { axiosInstance, getAxiosErrorMessage } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import { z } from "zod";

type DetailLevel = "none" | "title" | "full";
type DeliveryMethod = "email";

type Subscription = {
  id: number;
  eventType: string;
  detailLevel: DetailLevel;
  deliveryMethod: DeliveryMethod;
};

type EventTypeOption = {
  id: string;
  label: string;
  group: string;
};

const EVENT_TYPE_IDS = [
  "temperature",
  "humidity",
  "noiseLevel",
  "indoorLocation",
  "outdoorLocation",
  "infrastructure",
  "updateAvailable",
  "systemBoot",
  "login",
  "register",
  "passwordChange",
  "roleChange",
  "accessCode",
] as const;

const EventTypeSchema = z.enum(EVENT_TYPE_IDS);
const DetailLevelSchema = z.enum(["none", "title", "full"]);
const DeliveryMethodSchema = z.enum(["email"]);
const SubscriptionSchema = z.object({
  id: z.number().int().positive(),
  eventType: EventTypeSchema,
  detailLevel: DetailLevelSchema,
  deliveryMethod: DeliveryMethodSchema,
});
const CreateSubscriptionSchema = SubscriptionSchema.omit({ id: true });
const SubscriptionsResponseSchema = z.object({
  subscriptions: z.array(SubscriptionSchema),
});
const SubscriptionResponseSchema = z.object({
  subscription: SubscriptionSchema,
});
const SubscriptionIdSchema = z.number().int().positive();

const EVENT_TYPES: EventTypeOption[] = [
  { id: "temperature", label: "Temperature", group: "Environment" },
  { id: "humidity", label: "Humidity", group: "Environment" },
  { id: "noiseLevel", label: "Noise level", group: "Environment" },
  { id: "indoorLocation", label: "Indoor location", group: "Location" },
  { id: "outdoorLocation", label: "Outdoor location", group: "Location" },
  { id: "infrastructure", label: "Infrastructure", group: "System" },
  { id: "updateAvailable", label: "Update available", group: "System" },
  { id: "systemBoot", label: "System boot", group: "System" },
  { id: "login", label: "Login", group: "User activity" },
  { id: "register", label: "Register", group: "User activity" },
  { id: "passwordChange", label: "Password change", group: "User activity" },
  { id: "roleChange", label: "Role change", group: "User activity" },
  { id: "accessCode", label: "Access code", group: "User activity" },
];

const EVENT_TYPE_GROUPS = Array.from(
  new Set(EVENT_TYPES.map((eventType) => eventType.group)),
);

const DETAIL_LEVEL_OPTIONS: Array<{ value: DetailLevel; label: string }> = [
  { value: "none", label: "Generic alert" },
  { value: "title", label: "Title only" },
  { value: "full", label: "Full details" },
];

const DELIVERY_METHOD_OPTIONS: Array<{
  value: DeliveryMethod;
  label: string;
}> = [{ value: "email", label: "Email" }];

const INITIAL_DETAIL_LEVELS = Object.fromEntries(
  EVENT_TYPES.map((eventType) => [eventType.id, "none"]),
) as Record<string, DetailLevel>;

const INITIAL_DELIVERY_METHODS = Object.fromEntries(
  EVENT_TYPES.map((eventType) => [eventType.id, "email"]),
) as Record<string, DeliveryMethod>;

function getDetailLevelLabel(detailLevel: DetailLevel): string {
  return (
    DETAIL_LEVEL_OPTIONS.find((option) => option.value === detailLevel)?.label ??
    detailLevel
  );
}

function getDeliveryMethodLabel(deliveryMethod: DeliveryMethod): string {
  return (
    DELIVERY_METHOD_OPTIONS.find((option) => option.value === deliveryMethod)
      ?.label ?? deliveryMethod
  );
}

export default function Settings() {
  const queryClient = useQueryClient();
  const [detailLevelByEventType, setDetailLevelByEventType] = useState<
    Record<string, DetailLevel>
  >(INITIAL_DETAIL_LEVELS);
  const [deliveryMethodByEventType, setDeliveryMethodByEventType] = useState<
    Record<string, DeliveryMethod>
  >(INITIAL_DELIVERY_METHODS);

  const subscriptionsQuery = useQuery({
    queryKey: ["notification-subscriptions"],
    queryFn: async () => {
      const response = await axiosInstance.get(
        "/api/notification/subscriptions",
      );
      return SubscriptionsResponseSchema.parse(response.data).subscriptions;
    },
  });

  const subscribeMutation = useMutation({
    mutationFn: async (input: Omit<Subscription, "id">) => {
      const payload = CreateSubscriptionSchema.parse(input);
      const response = await axiosInstance.post(
        "/api/notification/subscriptions",
        payload,
      );
      return SubscriptionResponseSchema.parse(response.data).subscription;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["notification-subscriptions"],
      });
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async (subscriptionId: number) => {
      const parsedSubscriptionId = SubscriptionIdSchema.parse(subscriptionId);
      await axiosInstance.delete(
        `/api/notification/subscriptions/${parsedSubscriptionId}`,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["notification-subscriptions"],
      });
    },
  });

  const subscriptions = subscriptionsQuery.data ?? [];

  useEffect(() => {
    if (!subscriptionsQuery.isError) return;

    toast.error(
      getAxiosErrorMessage(
        subscriptionsQuery.error,
        "Failed to load notification subscriptions.",
      ),
    );
  }, [
    subscriptionsQuery.errorUpdatedAt,
    subscriptionsQuery.error,
    subscriptionsQuery.isError,
  ]);

  useEffect(() => {
    if (!subscribeMutation.isSuccess) return;

    toast.success("Subscription created successfully.");
    subscribeMutation.reset();
  }, [subscribeMutation.isSuccess, subscribeMutation]);

  useEffect(() => {
    if (!subscribeMutation.isError) return;

    toast.error(
      getAxiosErrorMessage(
        subscribeMutation.error,
        "Failed to create notification subscription.",
      ),
    );
    subscribeMutation.reset();
  }, [subscribeMutation.isError, subscribeMutation.error, subscribeMutation]);

  useEffect(() => {
    if (!unsubscribeMutation.isSuccess) return;

    toast.success("Subscription removed successfully.");
    unsubscribeMutation.reset();
  }, [unsubscribeMutation.isSuccess, unsubscribeMutation]);

  useEffect(() => {
    if (!unsubscribeMutation.isError) return;

    toast.error(
      getAxiosErrorMessage(
        unsubscribeMutation.error,
        "Failed to remove notification subscription.",
      ),
    );
    unsubscribeMutation.reset();
  }, [
    unsubscribeMutation.isError,
    unsubscribeMutation.error,
    unsubscribeMutation,
  ]);

  const handleSubscribe = (eventType: string) => {
    const parsedEventType = EventTypeSchema.safeParse(eventType);
    if (!parsedEventType.success) {
      toast.error("Invalid event type.");
      return;
    }

    subscribeMutation.mutate({
      eventType: parsedEventType.data,
      detailLevel: detailLevelByEventType[parsedEventType.data] ?? "none",
      deliveryMethod:
        deliveryMethodByEventType[parsedEventType.data] ?? "email",
    });
  };

  const handleUnsubscribe = (subscriptionId: number) => {
    const parsedSubscriptionId = SubscriptionIdSchema.safeParse(subscriptionId);
    if (!parsedSubscriptionId.success) {
      toast.error("Invalid subscription.");
      return;
    }

    unsubscribeMutation.mutate(parsedSubscriptionId.data);
  };

  const handleDetailLevelChange = (
    eventType: string,
    detailLevel: DetailLevel,
  ) => {
    const parsedEventType = EventTypeSchema.safeParse(eventType);
    const parsedDetailLevel = DetailLevelSchema.safeParse(detailLevel);

    if (!parsedEventType.success || !parsedDetailLevel.success) {
      toast.error("Invalid subscription detail level.");
      return;
    }

    setDetailLevelByEventType((prev) => ({
      ...prev,
      [parsedEventType.data]: parsedDetailLevel.data,
    }));
  };

  const handleDeliveryMethodChange = (
    eventType: string,
    deliveryMethod: DeliveryMethod,
  ) => {
    const parsedEventType = EventTypeSchema.safeParse(eventType);
    const parsedDeliveryMethod = DeliveryMethodSchema.safeParse(deliveryMethod);

    if (!parsedEventType.success || !parsedDeliveryMethod.success) {
      toast.error("Invalid delivery method.");
      return;
    }

    setDeliveryMethodByEventType((prev) => ({
      ...prev,
      [parsedEventType.data]: parsedDeliveryMethod.data,
    }));
  };

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Settings" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <div className="flex flex-col gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Notification subscriptions</CardTitle>
                      <CardDescription>
                        Choose which event types should create notifications.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {subscriptionsQuery.isLoading ? (
                        <div className="text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                          Loading subscriptions...
                        </div>
                      ) : subscriptionsQuery.isError ? (
                        <div className="text-sm text-destructive md:col-span-2 xl:col-span-3">
                          Failed to load subscriptions.
                        </div>
                      ) : null}
                      <div className="md:col-span-2 xl:col-span-3">
                        <div className="flex flex-col gap-8">
                          {EVENT_TYPE_GROUPS.map((group, groupIndex) => {
                            const groupedEventTypes = EVENT_TYPES.filter(
                              (eventType) => eventType.group === group,
                            );

                            return (
                              <div key={group} className="flex flex-col gap-4">
                                {groupIndex > 0 ? <Separator /> : null}
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-sm font-semibold tracking-wide text-foreground">
                                    {group}
                                  </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                  {groupedEventTypes.map((eventType) => {
                                    const eventSubscriptions = subscriptions.filter(
                                      (subscription) =>
                                        subscription.eventType === eventType.id,
                                    );
                                    const selectedDetailLevel =
                                      detailLevelByEventType[eventType.id] ??
                                      "none";
                                    const selectedDeliveryMethod =
                                      deliveryMethodByEventType[eventType.id] ??
                                      "email";
                                    const selectedPairExists =
                                      eventSubscriptions.some(
                                        (subscription) =>
                                          subscription.detailLevel ===
                                            selectedDetailLevel &&
                                          subscription.deliveryMethod ===
                                            selectedDeliveryMethod,
                                      );

                                    return (
                                      <div
                                        key={eventType.id}
                                        className="bg-background flex h-full flex-col gap-4 rounded-lg border p-4 shadow-xs"
                                      >
                                        <div className="text-base font-medium">
                                          {eventType.label}
                                        </div>

                                        <div className="flex flex-col gap-2">
                                          <div className="text-xs font-medium text-muted-foreground">
                                            Existing subscriptions
                                          </div>
                                          {eventSubscriptions.length === 0 ? (
                                            <div className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                                              No subscriptions yet.
                                            </div>
                                          ) : (
                                            <div className="flex flex-col gap-2">
                                              {eventSubscriptions.map(
                                                (subscription) => (
                                                  <div
                                                    key={subscription.id}
                                                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                                                  >
                                                    <div className="flex flex-wrap items-center gap-2 text-sm">
                                                      <Badge variant="secondary">
                                                        {getDetailLevelLabel(
                                                          subscription.detailLevel,
                                                        )}
                                                      </Badge>
                                                      <Badge variant="outline">
                                                        {getDeliveryMethodLabel(
                                                          subscription.deliveryMethod,
                                                        )}
                                                      </Badge>
                                                    </div>
                                                    <Button
                                                      size="sm"
                                                      variant="destructive"
                                                      onClick={() =>
                                                        handleUnsubscribe(
                                                          subscription.id,
                                                        )
                                                      }
                                                      disabled={
                                                        subscribeMutation.isPending ||
                                                        unsubscribeMutation.isPending
                                                      }
                                                    >
                                                      Unsubscribe
                                                    </Button>
                                                  </div>
                                                ),
                                              )}
                                            </div>
                                          )}
                                        </div>

                                        <div className="flex flex-col gap-2">
                                          <div className="text-xs font-medium text-muted-foreground">
                                            Detail level
                                          </div>
                                          <Select
                                            value={selectedDetailLevel}
                                            onValueChange={(
                                              value: DetailLevel,
                                            ) =>
                                              handleDetailLevelChange(
                                                eventType.id,
                                                value,
                                              )
                                            }
                                          >
                                            <SelectTrigger className="w-full">
                                              <SelectValue placeholder="Select detail level" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {DETAIL_LEVEL_OPTIONS.map(
                                                (option) => (
                                                  <SelectItem
                                                    key={option.value}
                                                    value={option.value}
                                                  >
                                                    {option.label}
                                                  </SelectItem>
                                                ),
                                              )}
                                            </SelectContent>
                                          </Select>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                          <div className="text-xs font-medium text-muted-foreground">
                                            Delivery
                                          </div>
                                          <Select
                                            value={selectedDeliveryMethod}
                                            onValueChange={(
                                              value: DeliveryMethod,
                                            ) =>
                                              handleDeliveryMethodChange(
                                                eventType.id,
                                                value,
                                              )
                                            }
                                          >
                                            <SelectTrigger className="w-full">
                                              <SelectValue placeholder="Select delivery method" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {DELIVERY_METHOD_OPTIONS.map(
                                                (option) => (
                                                  <SelectItem
                                                    key={option.value}
                                                    value={option.value}
                                                  >
                                                    {option.label}
                                                  </SelectItem>
                                                ),
                                              )}
                                            </SelectContent>
                                          </Select>
                                        </div>

                                        <div className="mt-auto flex items-center justify-end">
                                          <Button
                                            size="sm"
                                            onClick={() =>
                                              handleSubscribe(eventType.id)
                                            }
                                            disabled={
                                              selectedPairExists ||
                                              subscribeMutation.isPending ||
                                              unsubscribeMutation.isPending
                                            }
                                          >
                                            {selectedPairExists
                                              ? "Already added"
                                              : "Subscribe"}
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
