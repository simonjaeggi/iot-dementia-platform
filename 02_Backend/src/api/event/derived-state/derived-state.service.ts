import { EventDto } from "../zod/event.schema";
import { updateInfrastructureState } from "./infrastructure-state.service";

type DerivedStateUpdater = (
  eventId: number,
  event: EventDto,
) => Promise<void>;

const derivedStateUpdaters: DerivedStateUpdater[] = [updateInfrastructureState];

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
