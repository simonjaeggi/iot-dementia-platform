import { Context, MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { checkUserRole } from "./auth.service";
import { JwtPayloadDto, JwtPayloadSchema } from "./zod/jwt-payload.schema";
import {
  FingerprintDto,
  FingerprintSchema,
} from "../device/zod/cert-fingerprint.schema";
import { isDeviceAuthorised } from "../device/device.mtls.service";
import { validatedEnv } from "../../env-validation";

declare module "hono" {
  interface ContextVariableMap {
    authorisedDeviceFingerprint: FingerprintDto;
  }
}

/**
 * Helper function that extracts the user id from JWT token.
 * @argument c HTTP request context
 * @returns User id
 * @throws {HTTPException} 401 Invalid jwt payload
 */
export function getUserIdFromJwt(c: Context): number {
  const parsed = JwtPayloadSchema.safeParse(c.get("jwtPayload"));
  if (!parsed.success) {
    throw new HTTPException(401, { message: "Invalid user context." });
  }

  return parsed.data.sub;
}

/**
 * Helper function that extracts the user email from JWT token.
 * @argument c HTTP request context
 * @returns User email
 * @throws {HTTPException} 401 Invalid jwt payload
 */
export function getUserEmailFromJwt(c: Context): string {
  const parsed = JwtPayloadSchema.safeParse(c.get("jwtPayload"));
  if (!parsed.success) {
    throw new HTTPException(401, { message: "Invalid user context." });
  }

  return parsed.data.email;
}

/**
 * Helper function that extracts the device fingerprint from context.
 * @argument c HTTP request context
 * @returns Device fingerprint
 * @throws {HTTPException} 401 Invalid device context
 */
export function getDeviceFingerprintFromContext(c: Context): FingerprintDto {
  const parsed = FingerprintSchema.safeParse(c.get("authorisedDeviceFingerprint"));
  if (!parsed.success) {
    throw new HTTPException(401, { message: "Invalid device context." });
  }

  return parsed.data;
}

/**
 * Ensures the user has the admin role by checking user db role.
 * @returns {MiddlewareHandler}
 * @throws {HTTPException} 401 User not found
 * @throws {HTTPException} 403 Admin role not found on user
 */
export function requireAdmin(): MiddlewareHandler {
  return async (c, next) => {
    // Admin privilege should be checked on each request since roles can change.
    const userId = getUserIdFromJwt(c);
    const hasRole = await checkUserRole(userId, "admin");
    if (hasRole === null) {
      throw new HTTPException(401, { message: "User not found." });
    }
    if (!hasRole) {
      throw new HTTPException(403, { message: "Admin role required." });
    }

    await next();
  };
}

/**
 * Ensures the request contains an authorised device fingerprint.
 * @returns {MiddlewareHandler}
 * @throws {HTTPException} 400 Missing or invalid fingerprint header
 * @throws {HTTPException} 401 Device not authorised
 */
export function requireAuthorisedDeviceFingerprint(): MiddlewareHandler {
  return async (c, next) => {
    const headerFingerprint = c.req.header("X-Device-Fingerprint");

    if (!headerFingerprint) {
      throw new HTTPException(400, {
        message: "Missing X-Device-Fingerprint header.",
      });
    }

    const parsed = FingerprintSchema.safeParse(headerFingerprint);

    if (!parsed.success) {
      throw new HTTPException(400, {
        message: "Invalid fingerprint.",
      });
    }

    const fingerprint = parsed.data;

    const ok = validatedEnv.SUPER_DANGEROUS_TURN_OFF_DEVICE_AUTH_FOR_TESTING
      || await isDeviceAuthorised(fingerprint);
    if (!ok) {
      throw new HTTPException(401, {
        message: "Device not authorised.",
      });
    }

    c.set("authorisedDeviceFingerprint", fingerprint);
    await next();
  };
}
