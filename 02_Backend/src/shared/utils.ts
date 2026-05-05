/**
 * Function that returns a readable date in Swiss format.
 * @param date
 * @returns Readable Swiss-formatted date and time, for example `11.03.2026, 14:32:05 MEZ`.
 */
export function formatSwissTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("de-CH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Europe/Zurich",
    timeZoneName: "short",
  }).format(date);
}

/**
 * Returns a readable time string from seconds.
 * @param seconds seconds
 * @returns Readable duration string, for example `45 s`, `3 min 12 s`, `2 h 5 min`, or `1 d 4 h 8 min`.
 */
export function formatDurationFromSeconds(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  const parts: string[] = [];

  if (days > 0) parts.push(`${days} d`);
  if (hours > 0) parts.push(`${hours} h`);
  if (minutes > 0) parts.push(`${minutes} min`);
  if (remainingSeconds > 0 || parts.length === 0) {
    parts.push(`${remainingSeconds} s`);
  }

  return parts.join(" ");
}

/**
 * Returns the patient label used in notification texts.
 * Falls back to a neutral label when no patient name is configured.
 * @param patientName configured patient first name / surname
 * @returns patient label for notifications
 */
export function formatPatientLabel(patientName: string | null | undefined): string {
  const trimmedName = patientName?.trim();
  return trimmedName ? trimmedName : "The patient";
}

/**
 * Returns the device reference used in notification texts.
 * Uses the configured device name when available, otherwise a short alias.
 * @param deviceName configured device name
 * @param deviceFingerprint device fingerprint for alias generation
 * @returns device label for notifications
 */
export function formatDeviceReference(
  deviceName: string | null | undefined,
  deviceFingerprint: string,
): string {
  const trimmedName = deviceName?.trim();
  if (trimmedName) {
    return `device ${trimmedName}`;
  }

  return `device ${deviceFingerprint.slice(0, 6)}`;
}
