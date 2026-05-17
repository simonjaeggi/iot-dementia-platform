import { ExistingUser } from "../../db/types";
import { createEvent } from "./event.service";
import {
  AccessCodeActionType,
  EventDto,
  UserAuditType,
} from "./zod/event.schema";
import { UserRole } from "../auth/zod/user-roles.schema";

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
      service: "auth",
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
 * Log access code events.
 * @param type Access code action type
 * @param user User info
 * @param id Access code id
 */
export async function logAccessCodeEvent(
  type: AccessCodeActionType,
  user: AuditUser,
  id: number,
): Promise<void> {
  const event: EventDto = {
    type: "accessCode",
    time: new Date(),
    source: {
      kind: "backend",
      service: "auth",
    },
    data: {
      user: {
        id: user.id,
        email: user.email,
      },
      action: type,
      codeId: id,
    },
  };

  const created = await createEvent(event);
  if (!created) {
    console.error(`Failed to create ${type} event.`);
  }
}

/**
 * Log user role changes.
 * @param user Requesting user
 * @param changedUser User that is getting changed
 * @param fromRole Previous role
 * @param toRole New role
 */
export async function logRoleChangeEvent(
  user: AuditUser,
  changedUser: AuditUser,
  fromRole: UserRole,
  toRole: UserRole,
): Promise<void> {
  const event: EventDto = {
    type: "roleChange",
    time: new Date(),
    source: {
      kind: "backend",
      service: "auth",
    },
    data: {
      user: {
        id: user.id,
        email: user.email,
      },
      changedUser: {
        id: changedUser.id,
        email: changedUser.email,
      },
      fromRole,
      toRole,
    },
  };

  const created = await createEvent(event);
  if (!created) {
    console.error("Failed to create roleChange event.");
  }
}

/**
 * Log user deletions.
 * @param user Requesting user
 * @param deletedUser User that was deleted
 */
export async function logUserDeleteEvent(
  user: AuditUser,
  deletedUser: AuditUser,
): Promise<void> {
  const event: EventDto = {
    type: "userDelete",
    time: new Date(),
    source: {
      kind: "backend",
      service: "auth",
    },
    data: {
      user: {
        id: user.id,
        email: user.email,
      },
      deletedUser: {
        id: deletedUser.id,
        email: deletedUser.email,
      },
    },
  };

  const created = await createEvent(event);
  if (!created) {
    console.error("Failed to create userDelete event.");
  }
}

/**
 * Log a basic user audit event.
 * @param type Audit event type
 * @param user User info
 */
export async function logUpdateAvailableEvent(version: string): Promise<void> {
  const event: EventDto = {
    type: "updateAvailable",
    time: new Date(),
    source: {
      kind: "backend",
      service: "update",
    },
    data: {
      version,
    },
  };

  const created = await createEvent(event);
  if (!created) {
    console.error(`Failed to create UpdateAvailable event.`);
  }
}
