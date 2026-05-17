import { Context } from "hono";
import {
  dropUser,
  generateAccessCode,
  getAccessCodes,
  getUserById,
  getUserPushId,
  getUsers,
  loginUser,
  markAccessCodeRevoked,
  registerUser,
  updateUserRole,
} from "./auth.service";
import { JwtPayloadSchema } from "./zod/jwt-payload.schema";
import {
  DeleteUserSchema,
  LoginUserSchema,
  RegisterUserSchema,
} from "./zod/users.schema";
import { setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import {
  logAccessCodeEvent,
  logRoleChangeEvent,
  logUserDeleteEvent,
  logUserAuditEvent,
} from "../event/event.logger";
import {
  CreateUserFailedError,
  DeleteOnlyAdminError,
  DemoteOnlyAdminError,
  EmailAlreadyInUseError,
  InvalidAccessCodeError,
} from "./auth.exceptions";
import {
  CreateAccessCodeSchema,
  RevokeAccessCodeSchema,
} from "./zod/access-code.schema";
import { getUserEmailFromJwt, getUserIdFromJwt } from "./auth.middleware";
import { UpdateUserRoleSchema } from "./zod/user-roles.schema";

/**
 * Attempts to login user. Checks credentials and sets auth cookie on success.
 * @param c HTTP context
 * @returns HTTP JSON response { ok: true } if cookie set successfully
 * @throws {HTTPException} 400 payload invalid
 * @throws {HTTPException} 401 invalid credentials
 */
export async function login(c: Context) {
  const body = await c.req.json().catch(() => null);
  const dtoResult = LoginUserSchema.safeParse(body);
  if (!dtoResult.success) {
    throw new HTTPException(400, {
      message: dtoResult.error.issues[0]?.message ?? "Invalid payload.",
    });
  }
  const dto = dtoResult.data;
  const result = await loginUser(dto);
  if (!result) {
    throw new HTTPException(401, { message: "Invalid Credentials" });
  }
  const { token, user } = result;

  setCookie(c, "authCookie", token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
  });

  await logUserAuditEvent("login", user);

  return c.json({ ok: true });
}

/**
 * Logout user by resetting auth cookie.
 * @param c HTTP context
 * @returns HTTP JSON response { ok: true }
 */
export async function logout(c: Context) {
  setCookie(c, "authCookie", "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 0,
  });

  return c.json({ ok: true });
}

/**
 * Attempts to register user.
 * @param c HTTP context
 * @returns HTTP JSON response containing created user
 * @throws {HTTPException} 400 Invalid payload
 * @throws {HTTPException} 409 Email already in use
 * @throws {HTTPException} 500 Failed to create user
 */
export async function register(c: Context) {
  const body = await c.req.json().catch(() => null);

  const dtoResult = RegisterUserSchema.safeParse(body);
  if (!dtoResult.success) {
    throw new HTTPException(400, {
      message: dtoResult.error.issues[0]?.message ?? "Invalid payload.",
    });
  }
  const dto = dtoResult.data;

  try {
    const { user, redeemedAccessCodeId } = await registerUser(dto);
    await logUserAuditEvent("register", user);
    await logAccessCodeEvent("redeemed", user, redeemedAccessCodeId);

    return c.json(user);
  } catch (err) {
    if (err instanceof InvalidAccessCodeError) {
      throw new HTTPException(401, { message: "Invalid Access Code" });
    }
    if (err instanceof EmailAlreadyInUseError) {
      throw new HTTPException(409, { message: "Email already in use" });
    }
    if (err instanceof CreateUserFailedError) {
      throw new HTTPException(500, { message: "Failed to create user" });
    }
    throw err;
  }
}

/**
 * Get current user information.
 * @param c HTTP context
 * @returns HTTP JSON response containing created user
 * @throws {HTTPException} 401 Invalid user context
 * @throws {HTTPException} 401 User not found
 */
export async function me(c: Context) {
  const parsed = JwtPayloadSchema.safeParse(c.get("jwtPayload"));
  if (!parsed.success) {
    throw new HTTPException(401, { message: "Invalid user context." });
  }

  const user = await getUserById(parsed.data.sub);
  if (!user) {
    throw new HTTPException(401, { message: "User not found." });
  }

  return c.json(user);
}

/**
 * Get current user's push id.
 * @param c HTTP context
 * @returns HTTP JSON response containing the push id.
 * @throws {HTTPException} 401 Invalid user context
 * @throws {HTTPException} 401 User not found
 */
export async function myPushId(c: Context) {
  const userId = getUserIdFromJwt(c);
  const result = await getUserPushId(userId);
  if (!result) {
    throw new HTTPException(401, { message: "User not found." });
  }

  return c.json(result);
}

/**
 * Get all access codes entries without exposing the code value.
 * @param c HTTP context
 * @returns HTTP JSON response containing censored access codes.
 */
export async function accessCodes(c: Context) {
  return c.json(await getAccessCodes());
}

/**
 * Create a new access code for user registration.
 * @param c HTTP context containing access code validity payload.
 * @returns HTTP JSON response containing the generated access code.
 * @throws {HTTPException} 400 Invalid payload
 * @throws {HTTPException} 401 Invalid user context
 * @throws {HTTPException} 500 Failed to create access code
 */
export async function createAccessCode(c: Context) {
  const body = await c.req.json().catch(() => null);

  const dtoResult = CreateAccessCodeSchema.safeParse(body);
  if (!dtoResult.success) {
    throw new HTTPException(400, {
      message: dtoResult.error.issues[0]?.message ?? "Invalid payload.",
    });
  }
  const dto = dtoResult.data;

  const user = {
    id: getUserIdFromJwt(c),
    email: getUserEmailFromJwt(c),
  };
  const result = await generateAccessCode(dto.daysValid, user.id);
  if (!result) {
    throw new HTTPException(500, {
      message: "Failed to create access code.",
    });
  }

  await logAccessCodeEvent("generated", user, result.id);

  return c.json(result);
}

/**
 * Revoke an unused access code.
 * @param c HTTP context containing access code id payload.
 * @returns HTTP JSON response { ok: true } if revoked.
 * @throws {HTTPException} 400 Invalid payload
 * @throws {HTTPException} 401 Invalid user context
 * @throws {HTTPException} 404 Access code not found or not revokable
 */
export async function revokeAccessCode(c: Context) {
  const body = await c.req.json().catch(() => null);

  const dtoResult = RevokeAccessCodeSchema.safeParse(body);
  if (!dtoResult.success) {
    throw new HTTPException(400, {
      message: dtoResult.error.issues[0]?.message ?? "Invalid payload.",
    });
  }
  const result = await markAccessCodeRevoked(dtoResult.data.id);
  if (!result) {
    throw new HTTPException(404, {
      message: "Access code not found.",
    });
  }
  const user = {
    id: getUserIdFromJwt(c),
    email: getUserEmailFromJwt(c),
  };
  await logAccessCodeEvent("invalidated", user, dtoResult.data.id);

  return c.json({ ok: true });
}

/**
 * Get all users.
 * @param c HTTP context
 * @returns HTTP JSON response containing users.
 */
export async function users(c: Context) {
  return c.json(await getUsers());
}

/**
 * Delete a user.
 * @param c HTTP context
 * @returns HTTP JSON response containing the deleted user object.
 * @throws {HTTPException} 400 Invalid payload
 * @throws {HTTPException} 401 Invalid user context
 * @throws {HTTPException} 404 User not found
 * @throws {HTTPException} 409 Failed to delete only admin
 */
export async function deleteUser(c: Context) {
  const body = await c.req.json().catch(() => null);

  const dtoResult = DeleteUserSchema.safeParse(body);
  if (!dtoResult.success) {
    throw new HTTPException(400, {
      message: dtoResult.error.issues[0]?.message ?? "Invalid payload.",
    });
  }

  let result = null;
  try {
    result = await dropUser(dtoResult.data.userId);
  } catch (err) {
    if (err instanceof DeleteOnlyAdminError) {
      throw new HTTPException(409, { message: err.message });
    }
    throw err;
  }

  if (!result) {
    throw new HTTPException(404, {
      message: "User not found.",
    });
  }

  await logUserDeleteEvent(
    {
      id: getUserIdFromJwt(c),
      email: getUserEmailFromJwt(c),
    },
    result,
  );

  return c.json(result);
}

/**
 * Delete the authenticated user's own account.
 * @param c HTTP context
 * @returns HTTP JSON response containing the deleted user object.
 * @throws {HTTPException} 401 Invalid user context
 * @throws {HTTPException} 404 User not found
 * @throws {HTTPException} 409 Failed to delete only admin
 */
export async function deleteMe(c: Context) {
  const userId = getUserIdFromJwt(c);
  let result = null;
  try {
    result = await dropUser(userId);
  } catch (err) {
    if (err instanceof DeleteOnlyAdminError) {
      throw new HTTPException(409, { message: err.message });
    }
    throw err;
  }

  if (!result) {
    throw new HTTPException(404, {
      message: "User not found.",
    });
  }

  await logUserDeleteEvent(result, result);

  setCookie(c, "authCookie", "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 0,
  });

  return c.json(result);
}

/**
 * Change a users role.
 * @param c HTTP context
 * @returns HTTP JSON response containing the updated user object.
 * @throws {HTTPException} 400 Invalid payload
 * @throws {HTTPException} 401 Invalid user context
 * @throws {HTTPException} 404 User not found
 * @throws {HTTPException} 409 Failed to demote only admin
 */
export async function changeUserRole(c: Context) {
  const body = await c.req.json().catch(() => null);

  const dtoResult = UpdateUserRoleSchema.safeParse(body);
  if (!dtoResult.success) {
    throw new HTTPException(400, {
      message: dtoResult.error.issues[0]?.message ?? "Invalid payload.",
    });
  }

  let result = null;
  try {
    result = await updateUserRole(
      dtoResult.data.userId,
      dtoResult.data.userRole,
    );
  } catch (err) {
    if (err instanceof DemoteOnlyAdminError) {
      throw new HTTPException(409, { message: err.message });
    }
    throw err;
  }

  if (!result) {
    throw new HTTPException(404, {
      message: "User not found.",
    });
  }

  if (result.previousRole !== result.user.role) {
    await logRoleChangeEvent(
      {
        id: getUserIdFromJwt(c),
        email: getUserEmailFromJwt(c),
      },
      result.user,
      result.previousRole,
      result.user.role,
    );
  }

  return c.json(result.user);
}
