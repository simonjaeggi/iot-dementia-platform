import { ExistingUser } from "../../db/types";
import { createEvent } from "./event.service";
import { EventDto, UserAuditType } from "./zod/event.schema";

type AuditUser = Pick<ExistingUser, "id" | "email">;

/**
 * Log a basic user audit event.
 * @param type Audit event type
 * @param user User info
 */
export async function logUserAuditEvent(
  type: UserAuditType,
  user: AuditUser,
): Promise<void> {
  const event: EventDto = {
    type,
    time: new Date(),
    source: {
      kind: "backend",
      service: "auth"
    },
    data: {
      user: {
        id: user.id,
        email: user.email,
      },
    },
  };

  
  const created = await createEvent(event);
  if (!created) {
    console.error(`Failed to create ${type} event.`);
  }
}

/**
 * Log a basic user audit event.
 * @param type Audit event type
 * @param user User info
 */
export async function logUpdateAvailableEvent(
  version: string,
): Promise<void> {
  const event: EventDto = {
    type: "updateAvailable",
    time: new Date(),
    source: {
      kind: "backend",
      service: "update"
    },
    data: {
      version
    },
  };

  
  const created = await createEvent(event);
  if (!created) {
    console.error(`Failed to create UpdateAvailable event.`);
  }
}