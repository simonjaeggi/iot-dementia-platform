export function formatDateTime(value: string | null, emptyFallback = "Never") {
  if (!value) {
    return emptyFallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

/**
 * Turns a underscore or camel case string to space separated title case.
 */
export function labelToTitleCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatPrimitiveValue(
  value: string | number | boolean | null,
  nullFallback = "None",
) {
  if (value === null) {
    return nullFallback;
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}

export function formatOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function formatDurationToSeconds(
  value: string,
  unit: "minutes" | "hours",
) {
  const amount = formatOptionalNumber(value);
  if (amount === undefined) return undefined;

  return Math.round(unit === "hours" ? amount * 3600 : amount * 60);
}

export function formatSecondsToHoursMinutesSeconds(durationSeconds: number): string {
  const roundedSeconds = Math.max(0, Math.round(durationSeconds));
  const hours = Math.floor(roundedSeconds / 3600);
  const minutes = Math.floor((roundedSeconds % 3600) / 60);
  const seconds = roundedSeconds % 60;
  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (minutes > 0) {
    parts.push(`${minutes}min`);
  }

  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds}s`);
  }

  return parts.join(" ");
}