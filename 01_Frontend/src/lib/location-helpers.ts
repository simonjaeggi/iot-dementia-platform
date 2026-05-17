import type { ApiEvent, LocationBeacon } from "@/lib/api";

export type IndoorBeaconReading = {
  id: string;
  signalStrengthDbm: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normaliseMacIdentifier(value: string) {
  return value.trim().replace(/-/g, ":").toUpperCase();
}

export function isIndoorBeaconReading(
  value: unknown,
): value is IndoorBeaconReading {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.signalStrengthDbm === "number"
  );
}

export function getBeaconNamesByMac(beacons: LocationBeacon[]) {
  return new Map(
    beacons.map((beacon) => [
      normaliseMacIdentifier(beacon.macIdentifier),
      beacon.displayName,
    ]),
  );
}

export function getStrongestBeaconReading(event: ApiEvent) {
  const payload = event.data.data;
  if (
    !isRecord(payload) ||
    !("beacons" in payload) ||
    !Array.isArray(payload.beacons)
  ) {
    return null;
  }

  let strongest: IndoorBeaconReading | null = null;
  for (const beacon of payload.beacons) {
    if (!isIndoorBeaconReading(beacon)) continue;
    if (!strongest || beacon.signalStrengthDbm > strongest.signalStrengthDbm) {
      strongest = beacon;
    }
  }

  return strongest;
}

export function hasBeaconReading(event: ApiEvent) {
  return getStrongestBeaconReading(event) !== null;
}

export function getRoomFromEvent(
  event: ApiEvent,
  beaconNamesByMac: Map<string, string>,
) {
  const strongest = getStrongestBeaconReading(event);
  if (!strongest) return null;

  return (
    beaconNamesByMac.get(normaliseMacIdentifier(strongest.id)) ?? strongest.id
  );
}

export function getOutdoorLocation(
  event: ApiEvent,
): { lat: number; lng: number } | null {
  const payload = event.data.data;
  if (!isRecord(payload) || !("lat" in payload) || !("lng" in payload)) return null;

  const location = payload as { lat: number; lng: number };
  return { lat: location.lat, lng: location.lng };
}
