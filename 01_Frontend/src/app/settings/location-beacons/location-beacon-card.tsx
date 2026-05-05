import { Button } from "@/components/ui/button";
import type { LocationBeacon } from "@/lib/api";

type LocationBeaconCardProps = {
  beacon: LocationBeacon;
  canDelete: boolean;
  isPending: boolean;
  onDelete: (beaconId: number) => void;
};

export function LocationBeaconCard({
  beacon,
  canDelete,
  isPending,
  onDelete,
}: LocationBeaconCardProps) {
  return (
    <div className="bg-background flex h-full flex-col gap-4 rounded-lg border p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-base font-medium">{beacon.displayName}</div>
          <div className="text-xs text-muted-foreground">Room label beacon</div>
        </div>
        {canDelete ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDelete(beacon.id)}
            disabled={isPending}
          >
            Delete
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium text-muted-foreground">
          MAC identifier
        </div>
        <div className="rounded-md border px-3 py-2 font-mono text-sm">
          {beacon.macIdentifier}
        </div>
      </div>

      {!canDelete ? (
        <div className="mt-auto">
          <div className="text-xs text-muted-foreground">
            Only admins can delete beacons.
          </div>
        </div>
      ) : null}
    </div>
  );
}
