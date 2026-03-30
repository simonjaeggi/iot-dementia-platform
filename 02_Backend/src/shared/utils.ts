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