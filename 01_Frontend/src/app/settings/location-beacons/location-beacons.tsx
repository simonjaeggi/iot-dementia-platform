import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  axiosInstance,
  CreateLocationBeaconSchema,
  endpoints,
  getAxiosErrorMessage,
  LocationBeaconIdSchema,
  LocationBeaconResponseSchema,
  LocationBeaconsResponseSchema,
} from "@/lib/api";
import { useAuth } from "@/auth/use-auth";
import { PageLayout } from "@/components/page-layout";
import { LocationBeaconSection } from "./location-beacon-section";

export type LocationBeaconDraft = {
  displayName: string;
  macIdentifier: string;
};

export function LocationBeacons() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin";

  const [draft, setDraft] = useState<LocationBeaconDraft>(
    {displayName: "", macIdentifier: ""},
  );

  const beaconsQuery = useQuery({
    queryKey: ["location-beacons"],
    queryFn: async () => {
      const response = await axiosInstance.get(endpoints.misc.locationBeacons);
      return LocationBeaconsResponseSchema.parse(response.data).beacons;
    },
    retry: false,
  });

  const invalidateBeacons = () =>
    queryClient.invalidateQueries({ queryKey: ["location-beacons"] });

  const createMutation = useMutation({
    mutationFn: async (input: { displayName: string; macIdentifier: string }) => {
      const response = await axiosInstance.post(
        endpoints.misc.locationBeacons,
        input,
      );
      return LocationBeaconResponseSchema.parse(response.data).beacon;
    },
    onSuccess: () => {
      toast.success("Location beacon created successfully.");
      setDraft({displayName: "", macIdentifier: ""});
      invalidateBeacons();
    },
    onError: (error) =>
      toast.error(getAxiosErrorMessage(error, "Failed to create location beacon.")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (beaconId: number) => {
      const id = LocationBeaconIdSchema.parse(beaconId);
      await axiosInstance.delete(`/api/misc/location-beacon/${id}`);
    },
    onSuccess: () => {
      toast.success("Location beacon removed successfully.");
      invalidateBeacons();
    },
    onError: (error) =>
      toast.error(getAxiosErrorMessage(error, "Failed to remove location beacon.")),
  });

  function handleDraftChange(field: keyof LocationBeaconDraft, value: string) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  function handleCreate() {
    const result = CreateLocationBeaconSchema.safeParse(draft);
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? "Invalid location beacon.");
      return;
    }
    createMutation.mutate(result.data);
  }

  function handleDelete(beaconId: number) {
    const result = LocationBeaconIdSchema.safeParse(beaconId);
    if (!result.success) {
      toast.error("Invalid location beacon.");
      return;
    }
    deleteMutation.mutate(result.data);
  }

  const isPending = createMutation.isPending || deleteMutation.isPending;

  return (
    <PageLayout
      title="Location Beacons"
      contentClassName="flex flex-col gap-4"
    >
      <p className="text-muted-foreground text-sm">
        Manage room labels and BLE MAC identifiers for indoor location beacons.
      </p>
      <LocationBeaconSection
        isAdmin={isAdmin}
        beacons={beaconsQuery.data ?? []}
        draft={draft}
        isLoading={beaconsQuery.isLoading}
        isError={beaconsQuery.isError}
        isPending={isPending}
        onDraftChange={handleDraftChange}
        onCreate={handleCreate}
        onDelete={handleDelete}
      />
    </PageLayout>
  );
}
