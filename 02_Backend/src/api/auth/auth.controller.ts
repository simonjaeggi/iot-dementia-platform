import { Context } from "hono";
import { getUserById, loginUser, registerUser } from "./auth.service";
import { JwtPayloadSchema } from "./zod/jwt-payload.schema";
import { LoginUserSchema } from "./zod/login-user.schema";
import { RegisterUserSchema } from "./zod/register-user.schema";
import { setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { logUserAuditEvent } from "../event/event.logger";
import {
  CreateUserFailedError,
  EmailAlreadyInUseError,
  InvalidAccessCodeError,
} from "./auth.exceptions";

/**
 * Attempts to login user. Checks credentials and sets auth cookie on success.
 * @param c HTTP context
 * @returns HTTP JSON response { ok: true } if cookie set successfully
 * @throws {HTTPException} 400 payload invalid
 * @throws {HTTPException} 401 invalid credentials
 */
export async function login(c: Context): Promise<{ ok: boolean }> {
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
    sameSite: "lax",
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
  console.log(body);

  const dtoResult = RegisterUserSchema.safeParse(body);
  if (!dtoResult.success) {
    throw new HTTPException(400, {
      message: dtoResult.error.issues[0]?.message ?? "Invalid payload.",
    });
  }
  const dto = dtoResult.data;

  try {
    const user = await registerUser(dto);
    await logUserAuditEvent("register", user);

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
 * @throws {HTTPException} 400 Invalid payload
 * @throws {HTTPException} 409 Email already in use
 * @throws {HTTPException} 500 Failed to create user
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

  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
}
