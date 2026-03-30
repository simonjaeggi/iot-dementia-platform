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

export function formatEventType(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());
}

export function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function formatLabel(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (character) => character.toUpperCase());
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
