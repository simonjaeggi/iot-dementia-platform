import { Context, MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { checkUserRole } from "./auth.service";
import { JwtPayloadDto, JwtPayloadSchema } from "./zod/jwt-payload.schema";
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
