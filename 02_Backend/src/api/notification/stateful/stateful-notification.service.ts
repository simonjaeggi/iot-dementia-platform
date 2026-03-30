import { processInfrastructureNotifications } from "./infrastructure-status-too-long.service";

type StatefulNotificationProcessor = (now: Date) => Promise<void>;

const statefulNotificationProcessors: StatefulNotificationProcessor[] = [
  processInfrastructureNotifications,
];

/**
 * Calls all registered stateful process functions to check if any status table
 * requires a new notification.
 * @param now Date to check table against. Defaults to new Date().
 */
export async function processStatefulNotifications(
  now: Date = new Date(),
): Promise<void> {
  for (const processStatefulNotification of statefulNotificationProcessors) {
    await processStatefulNotification(now);
  }
}
