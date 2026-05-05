import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationBeaconCard } from "./location-beacon-card";
import type { LocationBeacon } from "@/lib/api";
import type { LocationBeaconDraft } from "./location-beacons";



type LocationBeaconSectionProps = {
  isAdmin: boolean;
  beacons: LocationBeacon[];
  draft: LocationBeaconDraft;
  isLoading: boolean;
  isError: boolean;
  isPending: boolean;
  onDraftChange: (
    field: keyof LocationBeaconDraft,
    value: string,
  ) => void;
  onCreate: () => void;
  onDelete: (beaconId: number) => void;
};

export function LocationBeaconSection({
  isAdmin,
  beacons,
  draft,
  isLoading,
  isError,
  isPending,
  onDraftChange,
  onCreate,
  onDelete,
}: LocationBeaconSectionProps) {
  const emptyStateColumnClass = "md:col-span-2 xl:col-span-3";

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {isLoading ? (
        <div className={`text-sm text-muted-foreground ${emptyStateColumnClass}`}>
          Loading beacons...
        </div>
      ) : null}

      {isError ? (
        <div className={`text-sm text-destructive ${emptyStateColumnClass}`}>
          Failed to load location beacons.
        </div>
      ) : null}

      {!isLoading && !isError && beacons.length === 0 ? (
        <div
          className={`rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground ${emptyStateColumnClass}`}
        >
          No location beacons configured yet.
        </div>
      ) : null}

      {!isLoading && !isError
        ? beacons.map((beacon) => (
            <LocationBeaconCard
              key={beacon.id}
              beacon={beacon}
              canDelete={isAdmin}
              isPending={isPending}
              onDelete={onDelete}
            />
          ))
        : null}

      {isAdmin ? (
        <form
          className="bg-background flex max-w-md flex-col gap-4 rounded-lg border p-4 shadow-xs md:col-span-2 xl:col-span-3"
          onSubmit={(event) => {
            event.preventDefault();
            onCreate();
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="text-base font-medium">Add beacon</div>
            <Button size="sm" type="submit" disabled={isPending}>
              Add beacon
            </Button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="text-xs font-medium text-muted-foreground">
                Display name
              </div>
              <Input
                placeholder="Living Room"
                value={draft.displayName}
                onChange={(event) =>
                  onDraftChange("displayName", event.target.value)
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-xs font-medium text-muted-foreground">
                MAC identifier
              </div>
              <Input
                placeholder="AA:BB:CC:DD:EE:FF"
                value={draft.macIdentifier}
                onChange={(event) =>
                  onDraftChange("macIdentifier", event.target.value)
                }
              />
            </div>
          </div>
        </form>
      ) : null}
    </div>
  );
}
