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

  // todo not sure how I should handle failed events yet.
  const created = await createEvent(event);
  if (!created) {
    console.error(`Failed to create ${type} event.`);
  }
}