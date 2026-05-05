import { EventDto } from "../zod/event.schema";
import { updateFallDetectionState } from "./fall-detection-state.service";
import { updateIndoorLocationState } from "./indoor-location-state.service";
import { updateInfrastructureState } from "./infrastructure-state.service";
import { updateOutdoorGeofenceState } from "./outdoor-geofence-state.service";

type DerivedStateUpdater = (
  eventId: number,
  event: EventDto,
) => Promise<void>;

const derivedStateUpdaters: DerivedStateUpdater[] = [
  updateIndoorLocationState,
  updateFallDetectionState,
  updateInfrastructureState,
  updateOutdoorGeofenceState,
];

/**
 * Runs all derived state updaters against a given event.
 * @param eventId event id
 * @param event event
 */
export async function updateDerivedStates(
  eventId: number,
  event: EventDto,
): Promise<void> {
  for (const updateDerivedState of derivedStateUpdaters) {
    await updateDerivedState(eventId, event);
  }
}
