import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { axiosInstance, getAxiosErrorMessage } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/auth/use-auth";
import {
  buildThresholdConfig,
  createEmptyLocationBeaconDraft,
  createEmptyNumericThresholdDraft,
  createEmptyOutdoorLocationThresholdDraft,
  createEmptyPatientDraft,
  createInitialDeviceSelections,
  createInitialDeliveryMethods,
  createInitialDetailLevels,
  createInitialNumericThresholds,
  createInitialOutdoorLocationThresholds,
  createInitialStateDurationThresholds,
  CreateLocationBeaconSchema,
  CreatePatientSchema,
  CreateSubscriptionSchema,
  DeliveryMethodSchema,
  DetailLevelSchema,
  DevicesResponseSchema,
  EVENT_GROUPS,
  LocationBeaconIdSchema,
  LocationBeaconResponseSchema,
  LocationBeaconsResponseSchema,
  PatientResponseSchema,
  SETTINGS_PAGE_SECTION_IDS,
  groupSubscriptionsByType,
  SubscriptionIdSchema,
  SubscriptionResponseSchema,
  SubscriptionsResponseSchema,
  UpdatePatientSchema,
} from "./settings.config";
import type {
  CreatePatient,
  CreateSubscription,
  DeviceSelectionsByType,
  DeliveryMethod,
  DetailLevel,
  LocationBeaconDraft,
  PatientDraft,
  NumericThresholdDraft,
  NumericThresholdsByType,
  OutdoorLocationThresholdDraft,
  GeoRadiusThresholdsByType,
  StateDurationThresholdDraft,
  StateDurationThresholdsByType,
  SubscriptionType,
  UpdatePatient,
} from "./settings.config";
import { AccessCodeSettings } from "./access-code-settings";
import { LocationBeaconSection } from "./location-beacon-section";
import { NotificationSubscriptionSection } from "./notification-subscription-section";
import { PatientInformationSettings } from "./patient-information-settings";

type FormState = {
  detailLevels: ReturnType<typeof createInitialDetailLevels>;
  deliveryMethods: ReturnType<typeof createInitialDeliveryMethods>;
  deviceSelections: DeviceSelectionsByType;
  numericThresholds: NumericThresholdsByType;
  outdoorLocationThresholds: GeoRadiusThresholdsByType;
  stateDurationThresholds: StateDurationThresholdsByType;
};

function createInitialFormState(): FormState {
  return {
    detailLevels: createInitialDetailLevels(),
    deliveryMethods: createInitialDeliveryMethods(),
    deviceSelections: createInitialDeviceSelections(),
    numericThresholds: createInitialNumericThresholds(),
    outdoorLocationThresholds: createInitialOutdoorLocationThresholds(),
    stateDurationThresholds: createInitialStateDurationThresholds(),
  };
}

export default function Settings() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(createInitialFormState);
  const [locationBeaconDraft, setLocationBeaconDraft] = useState<LocationBeaconDraft>(
    createEmptyLocationBeaconDraft,
  );
  const [patientDraft, setPatientDraft] = useState<PatientDraft>(
    createEmptyPatientDraft,
  );
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(true);
  const [isLocationBeaconsOpen, setIsLocationBeaconsOpen] = useState(true);
  const isAdmin = user?.role === "admin";

  const invalidateSubscriptions = () =>
    queryClient.invalidateQueries({ queryKey: ["notification-subscriptions"] });
  const invalidateLocationBeacons = () =>
    queryClient.invalidateQueries({ queryKey: ["location-beacons"] });
  const invalidatePatient = () =>
    queryClient.invalidateQueries({ queryKey: ["patient"] });

  const subscriptionsQuery = useQuery({
    queryKey: ["notification-subscriptions"],
    queryFn: async () => {
      const response = await axiosInstance.get("/api/notification/subscriptions");
      return SubscriptionsResponseSchema.parse(response.data).subscriptions;
    },
    retry: false,
  });

  const locationBeaconsQuery = useQuery({
    queryKey: ["location-beacons"],
    queryFn: async () => {
      const response = await axiosInstance.get("/api/misc/location-beacon");
      return LocationBeaconsResponseSchema.parse(response.data).beacons;
    },
    retry: false,
  });

  const patientQuery = useQuery({
    queryKey: ["patient"],
    queryFn: async () => {
      const response = await axiosInstance.get("/api/misc/patient");
      return PatientResponseSchema.parse(response.data).patient;
    },
    retry: false,
  });

  const devicesQuery = useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      const response = await axiosInstance.get("/api/device/web");
      return DevicesResponseSchema.parse(response.data).devices;
    },
    retry: false,
  });

  const subscribeMutation = useMutation({
    mutationFn: async (input: CreateSubscription) => {
      const response = await axiosInstance.post("/api/notification/subscriptions", input);
      return SubscriptionResponseSchema.parse(response.data).subscription;
    },
    onSuccess: () => {
      toast.success("Subscription created successfully.");
      invalidateSubscriptions();
    },
    onError: (error) =>
      toast.error(getAxiosErrorMessage(error, "Failed to create notification subscription.")),
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
      toast.error(getAxiosErrorMessage(error, "Failed to remove notification subscription.")),
  });

  const createLocationBeaconMutation = useMutation({
    mutationFn: async (input: { displayName: string; macIdentifier: string }) => {
      const response = await axiosInstance.post("/api/misc/location-beacon", input);
      return LocationBeaconResponseSchema.parse(response.data).beacon;
    },
    onSuccess: () => {
      toast.success("Location beacon created successfully.");
      setLocationBeaconDraft(createEmptyLocationBeaconDraft());
      invalidateLocationBeacons();
    },
    onError: (error) =>
      toast.error(getAxiosErrorMessage(error, "Failed to create location beacon.")),
  });

  const deleteLocationBeaconMutation = useMutation({
    mutationFn: async (beaconId: number) => {
      const id = LocationBeaconIdSchema.parse(beaconId);
      await axiosInstance.delete(`/api/misc/location-beacon/${id}`);
    },
    onSuccess: () => {
      toast.success("Location beacon removed successfully.");
      invalidateLocationBeacons();
    },
    onError: (error) =>
      toast.error(getAxiosErrorMessage(error, "Failed to remove location beacon.")),
  });

  const createPatientMutation = useMutation({
    mutationFn: async (input: CreatePatient) => {
      const response = await axiosInstance.post("/api/misc/patient", input);
      return PatientResponseSchema.parse(response.data).patient;
    },
    onSuccess: () => {
      toast.success("Patient created successfully.");
      invalidatePatient();
    },
    onError: (error) =>
      toast.error(getAxiosErrorMessage(error, "Failed to create patient.")),
  });

  const updatePatientMutation = useMutation({
    mutationFn: async (input: UpdatePatient) => {
      const response = await axiosInstance.put("/api/misc/patient", input);
      return PatientResponseSchema.parse(response.data).patient;
    },
    onSuccess: () => {
      toast.success("Patient updated successfully.");
      invalidatePatient();
    },
    onError: (error) =>
      toast.error(getAxiosErrorMessage(error, "Failed to update patient.")),
  });

  useEffect(() => {
    if (patientQuery.data) {
      setPatientDraft({
        surname: patientQuery.data.surname,
        lastname: patientQuery.data.lastname,
        birthday: patientQuery.data.birthday,
      });
      return;
    }

    if (!patientQuery.isLoading && !patientQuery.isError) {
      setPatientDraft(createEmptyPatientDraft());
    }
  }, [patientQuery.data, patientQuery.isError, patientQuery.isLoading]);

  const handleSubscribe = (type: SubscriptionType) => {
    const result = CreateSubscriptionSchema.safeParse({
      type,
      deviceFingerprint: form.deviceSelections[type],
      detailLevel: form.detailLevels[type],
      deliveryMethod: form.deliveryMethods[type],
      thresholdConfig: buildThresholdConfig(
        type,
        form.numericThresholds,
        form.outdoorLocationThresholds,
        form.stateDurationThresholds,
      ),
    });

    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? "Invalid subscription.");
      return;
    }

    subscribeMutation.mutate(result.data);
  };

  const handleUnsubscribe = (subscriptionId: number) => {
    const result = SubscriptionIdSchema.safeParse(subscriptionId);
    if (!result.success) {
      toast.error("Invalid subscription.");
      return;
    }
    unsubscribeMutation.mutate(result.data);
  };

  const handleLocationBeaconDraftChange = (
    field: keyof LocationBeaconDraft,
    value: string,
  ) => {
    setLocationBeaconDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePatientDraftChange = (
    field: keyof PatientDraft,
    value: string,
  ) => {
    setPatientDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDeviceFingerprintChange = (
    type: SubscriptionType,
    deviceFingerprint: string | null,
  ) => {
    setForm((prev) => ({
      ...prev,
      deviceSelections: {
        ...prev.deviceSelections,
        [type]: deviceFingerprint,
      },
    }));
  };

  const handleCreateLocationBeacon = () => {
    const result = CreateLocationBeaconSchema.safeParse(locationBeaconDraft);

    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? "Invalid location beacon.");
      return;
    }

    createLocationBeaconMutation.mutate(result.data);
  };

  const handleDeleteLocationBeacon = (beaconId: number) => {
    const result = LocationBeaconIdSchema.safeParse(beaconId);

    if (!result.success) {
      toast.error("Invalid location beacon.");
      return;
    }

    deleteLocationBeaconMutation.mutate(result.data);
  };

  const handleSavePatient = () => {
    if (!isAdmin) {
      return;
    }

    const schema = patientQuery.data ? UpdatePatientSchema : CreatePatientSchema;
    const result = schema.safeParse(patientDraft);

    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? "Invalid patient.");
      return;
    }

    if (patientQuery.data) {
      updatePatientMutation.mutate(result.data);
      return;
    }

    createPatientMutation.mutate(result.data);
  };

  const handleDetailLevelChange = (type: SubscriptionType, detailLevel: DetailLevel) => {
    const result = DetailLevelSchema.safeParse(detailLevel);
    if (!result.success) return toast.error("Invalid subscription detail level.");
    setForm((prev) => ({
      ...prev,
      detailLevels: { ...prev.detailLevels, [type]: result.data },
    }));
  };

  const handleDeliveryMethodChange = (type: SubscriptionType, deliveryMethod: DeliveryMethod) => {
    const result = DeliveryMethodSchema.safeParse(deliveryMethod);
    if (!result.success) return toast.error("Invalid delivery method.");
    setForm((prev) => ({
      ...prev,
      deliveryMethods: { ...prev.deliveryMethods, [type]: result.data },
    }));
  };

  const handleNumericThresholdChange = (
    type: SubscriptionType,
    thresholdDraft: NumericThresholdDraft,
  ) => {
    setForm((prev) => ({
      ...prev,
      numericThresholds: {
        ...prev.numericThresholds,
        [type]: thresholdDraft,
      },
    }));
  };

  const handleClearNumericThreshold = (type: SubscriptionType) => {
    setForm((prev) => ({
      ...prev,
      numericThresholds: {
        ...prev.numericThresholds,
        [type]: createEmptyNumericThresholdDraft(),
      },
    }));
  };

  const handleOutdoorLocationThresholdChange = (
    type: SubscriptionType,
    field: keyof OutdoorLocationThresholdDraft,
    value: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      outdoorLocationThresholds: {
        ...prev.outdoorLocationThresholds,
        [type]: {
          ...(prev.outdoorLocationThresholds[type] ?? createEmptyOutdoorLocationThresholdDraft()),
          [field]: value,
        },
      },
    }));
  };

  const handleStateDurationThresholdChange = (
    type: SubscriptionType,
    thresholdDraft: StateDurationThresholdDraft,
  ) => {
    setForm((prev) => ({
      ...prev,
      stateDurationThresholds: {
        ...prev.stateDurationThresholds,
        [type]: thresholdDraft,
      },
    }));
  };

  const subscriptionsByType = groupSubscriptionsByType(subscriptionsQuery.data ?? []);
  const isMutating = subscribeMutation.isPending || unsubscribeMutation.isPending;
  const isLocationBeaconPending =
    createLocationBeaconMutation.isPending || deleteLocationBeaconMutation.isPending;
  const isPatientPending =
    createPatientMutation.isPending || updatePatientMutation.isPending;
  const notificationsHash = `#${SETTINGS_PAGE_SECTION_IDS.notifications}`;
  const locationBeaconsHash = `#${SETTINGS_PAGE_SECTION_IDS.locationBeacons}`;
  const isNotificationsSectionOpen =
    isNotificationsOpen || location.hash === notificationsHash;
  const isLocationBeaconsSectionOpen =
    isLocationBeaconsOpen || location.hash === locationBeaconsHash;

  const clearHash = () => {
    navigate(
      {
        pathname: location.pathname,
        search: location.search,
      },
      { replace: true },
    );
  };

  const toggleNotificationsSection = () => {
    if (isNotificationsSectionOpen) {
      setIsNotificationsOpen(false);

      if (location.hash === notificationsHash) {
        clearHash();
      }

      return;
    }

    setIsNotificationsOpen(true);
  };

  const toggleLocationBeaconsSection = () => {
    if (isLocationBeaconsSectionOpen) {
      setIsLocationBeaconsOpen(false);

      if (location.hash === locationBeaconsHash) {
        clearHash();
      }

      return;
    }

    setIsLocationBeaconsOpen(true);
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
                  <section
                    id={SETTINGS_PAGE_SECTION_IDS.notifications}
                    className="scroll-mt-24"
                  >
                    <Card>
                      <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div className="space-y-1">
                          <CardTitle>Notification Subscriptions</CardTitle>
                          <CardDescription>
                            Choose which event types should create notifications.
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="mt-0.5"
                          onClick={toggleNotificationsSection}
                          aria-label={
                            isNotificationsSectionOpen
                              ? "Collapse notification subscriptions"
                              : "Expand notification subscriptions"
                          }
                        >
                          <ChevronDown
                            className={cn(
                              "size-4 transition-transform",
                              !isNotificationsSectionOpen && "-rotate-90"
                            )}
                          />
                        </Button>
                      </CardHeader>
                      {isNotificationsSectionOpen ? (
                        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {subscriptionsQuery.isLoading && (
                            <div className="text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                              Loading subscriptions...
                            </div>
                          )}
                          {subscriptionsQuery.isError && (
                            <div className="text-sm text-destructive md:col-span-2 xl:col-span-3">
                              Failed to load subscriptions.
                            </div>
                          )}
                          <div className="md:col-span-2 xl:col-span-3">
                            <div className="flex flex-col gap-8">
                              {EVENT_GROUPS.map((group, index) => (
                                <NotificationSubscriptionSection
                                  key={group}
                                  group={group}
                                  showSeparator={index > 0}
                                  subscriptionsByType={subscriptionsByType}
                                  availableDevices={devicesQuery.data ?? []}
                                  deviceSelectionsByType={form.deviceSelections}
                                  detailLevelsByType={form.detailLevels}
                                  deliveryMethodsByType={form.deliveryMethods}
                                  numericThresholdsByType={form.numericThresholds}
                                  geoRadiusThresholdsByType={form.outdoorLocationThresholds}
                                  stateDurationThresholdsByType={form.stateDurationThresholds}
                                  isPending={isMutating}
                                  isDeviceListLoading={devicesQuery.isLoading}
                                  isDeviceListError={devicesQuery.isError}
                                  onDetailLevelChange={handleDetailLevelChange}
                                  onDeliveryMethodChange={handleDeliveryMethodChange}
                                  onDeviceFingerprintChange={handleDeviceFingerprintChange}
                                  onNumericThresholdChange={handleNumericThresholdChange}
                                  onClearNumericThreshold={handleClearNumericThreshold}
                                  onOutdoorLocationThresholdChange={handleOutdoorLocationThresholdChange}
                                  onStateDurationThresholdChange={handleStateDurationThresholdChange}
                                  onSubscribe={handleSubscribe}
                                  onUnsubscribe={handleUnsubscribe}
                                />
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      ) : null}
                    </Card>
                  </section>

                  <section
                    id={SETTINGS_PAGE_SECTION_IDS.locationBeacons}
                    className="scroll-mt-24"
                  >
                    <Card>
                      <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div className="space-y-1">
                          <CardTitle>Location Beacons</CardTitle>
                          <CardDescription>
                            Manage room labels and BLE MAC identifiers for indoor location beacons.
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="mt-0.5"
                          onClick={toggleLocationBeaconsSection}
                          aria-label={
                            isLocationBeaconsSectionOpen
                              ? "Collapse location beacons"
                              : "Expand location beacons"
                          }
                        >
                          <ChevronDown
                            className={cn(
                              "size-4 transition-transform",
                              !isLocationBeaconsSectionOpen && "-rotate-90"
                            )}
                          />
                        </Button>
                      </CardHeader>
                      {isLocationBeaconsSectionOpen ? (
                        <CardContent>
                          <LocationBeaconSection
                            isAdmin={isAdmin}
                            beacons={locationBeaconsQuery.data ?? []}
                            draft={locationBeaconDraft}
                            isLoading={locationBeaconsQuery.isLoading}
                            isError={locationBeaconsQuery.isError}
                            isPending={isLocationBeaconPending}
                            onDraftChange={handleLocationBeaconDraftChange}
                            onCreate={handleCreateLocationBeacon}
                            onDelete={handleDeleteLocationBeacon}
                          />
                        </CardContent>
                      ) : null}
                    </Card>
                  </section>

                  <section
                    id={SETTINGS_PAGE_SECTION_IDS.userRoles}
                    className="scroll-mt-24"
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>User &amp; Roles</CardTitle>
                        <CardDescription>
                          User and role management will be added here.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-muted-foreground text-sm">
                          No user and role settings are available yet.
                        </div>
                      </CardContent>
                    </Card>
                  </section>

                  <section
                    id={SETTINGS_PAGE_SECTION_IDS.accessCodes}
                    className="scroll-mt-24"
                  >
                    <AccessCodeSettings />
                  </section>

                  <section
                    id={SETTINGS_PAGE_SECTION_IDS.patientInformation}
                    className="scroll-mt-24"
                  >
                    <PatientInformationSettings
                      isAdmin={isAdmin}
                      patient={patientQuery.data ?? null}
                      draft={patientDraft}
                      isLoading={patientQuery.isLoading}
                      isError={patientQuery.isError}
                      isPending={isPatientPending}
                      onDraftChange={handlePatientDraftChange}
                      onSave={handleSavePatient}
                    />
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
