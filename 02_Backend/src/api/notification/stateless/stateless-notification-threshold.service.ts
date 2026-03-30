import { EventDto } from "../../event/zod/event.schema";
import {
  ThresholdConfig,
  NumericThresholdConfig,
} from "../zod/threshold.schema";

/**
 * Takes an event and checks if it exceeds a given threshold configuration.
 * @param event Event to check against a threshold configuration.
 * @param thresholdConfig Threshold configuration.
 * @returns True if no threshold is defined or if the value is exceeded, false otherwise.
 */
export function matchesStatelessThreshold(
  event: EventDto,
  thresholdConfig: ThresholdConfig,
): boolean {
  if (!thresholdConfig) {
    return true;
  }

  if (!("data" in event)) {
    return false;
  }

  if (thresholdConfig.category === "eventNumeric") {
    if (!(thresholdConfig.field in event.data)) {
      return false;
    }
    const numericEventData = event.data as Record<string, number>;
    return matchesNumericThreshold(
      numericEventData[thresholdConfig.field],
      thresholdConfig,
    );
  }

  return false;
}

/**
 * Helper function that checks if a given value exceeds a numeric event threshold using a min-max allowed range.
 * @param value Input value
 * @param thresholdConfig Threshold config to check against
 * @returns true if value outside of threshold range, false if inside.
 */
function matchesNumericThreshold(
  value: number,
  thresholdConfig: NumericThresholdConfig,
): boolean {
  if (value < thresholdConfig.min) {
    return true;
  }

  if (value > thresholdConfig.max) {
    return true;
  }

  return false;
}
