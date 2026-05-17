import { sign } from "hono/jwt";
import { LoginUserDto, RegisterUserDto } from "./zod/users.schema";
import { accessCodes, users } from "../../db/schema";
import { db } from "../../db/db";
import { ExistingAccessCode, ExistingUser, NewUser } from "../../db/types";
import { DatabaseError } from "pg";
import { DrizzleQueryError } from "drizzle-orm/errors";
import { and, count, eq, gt, isNull, or, sql } from "drizzle-orm";
import { validatedEnv } from "../../env-validation";
import { UserRole } from "./zod/user-roles.schema";
import {
  CreateInitialAccessCodeError,
  CreateUserFailedError,
  DeleteOnlyAdminError,
  DemoteOnlyAdminError,
  EmailAlreadyInUseError,
  InvalidAccessCodeError,
} from "./auth.exceptions";
import { randomBytes } from "crypto";
import { AccessCode } from "./zod/access-code.schema";

type JwtUser = Pick<ExistingUser, "id" | "email" | "role">;
type CensoredAccessCode = Omit<ExistingAccessCode, "code">;

export type PublicUser = Pick<ExistingUser, "id" | "email" | "name" | "role">;
type UserPasswordHash = Pick<ExistingUser, "email" | "passwordHash">;
export type UserPushId = Pick<ExistingUser, "pushId">;
export type UserRoleUpdateResult = {
  user: PublicUser;
  previousRole: UserRole;
};
export type LoginSuccess = {
  token: string;
  user: Pick<ExistingUser, "id" | "email">;
};
export type RegisterSuccess = {
  user: PublicUser;
  redeemedAccessCodeId: number;
};

/**
 * Authenticate user and return jwt access token if successful.
 * @param data User login information {email, password}
 * @returns {Promise<LoginSuccess | null>} LoginSuccess if user authentication successful, otherwise null.
 */
export async function loginUser(
  data: LoginUserDto,
): Promise<LoginSuccess | null> {
  const credentials = await getUserPasswordHash(data.email);
  if (
    !credentials ||
    !(await Bun.password.verify(data.password, credentials.passwordHash))
  ) {
    return null;
  }
  const dbUser = await getUserByEmail(credentials.email);
  if (!dbUser) {
    return null;
  }

  const token = await createJWTAccessToken({
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role,
  });
  return { token, user: { id: dbUser.id, email: dbUser.email } };
}

/**
 * Register user and return public user info and redeemed access code if successful.
 * @param data User registration information {accesscode, email, password, name}
 * @returns {Promise<RegisterSuccess>} User info and redeemed access code id.
 * @throws {InvalidAccessCodeError} Provided access code invalid
 * @throws {EmailAlreadyInUseError} Email already in use
 * @throws {CreateUserFailedError} Failed to create user in db
 */
export async function registerUser(
  data: RegisterUserDto,
): Promise<RegisterSuccess> {
  const passwordHash = await Bun.password.hash(data.password);
  const pushId = randomBytes(32).toString("hex");

  try {
    const createdUser = await db.transaction(async (tx) => {
      const newUser: NewUser = {
        name: data.name,
        email: data.email,
        passwordHash,
        pushId,
        role: "user",
      };

      const [user] = await tx.insert(users).values(newUser).returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      });

      const redeemedAccessCode = await redeemAccessCode(
        tx,
        data.accessCode,
        user.email,
        user.id,
      );

      if (!redeemedAccessCode) {
        throw new InvalidAccessCodeError();
      }

      if (!redeemedAccessCode.isInitialAccessCode) {
        return {
          user,
          redeemedAccessCodeId: redeemedAccessCode.accessCodeId,
        };
      }

      const [adminUser] = await tx
        .update(users)
        .set({ role: "admin" })
        .where(eq(users.id, user.id))
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
        });

      if (!adminUser) {
        throw new CreateUserFailedError();
      }

      return {
        user: adminUser,
        redeemedAccessCodeId: redeemedAccessCode.accessCodeId,
      };
    });

    return createdUser;
  } catch (err) {
    if (err instanceof InvalidAccessCodeError) throw err;

    if (
      err instanceof DrizzleQueryError &&
      err.cause instanceof DatabaseError
    ) {
      if (
        err.cause.code === "23505" &&
        err.cause.constraint === "users_email_unique"
      ) {
        throw new EmailAlreadyInUseError();
      }
    }

    throw new CreateUserFailedError();
  }
}

/**
 * Create and return JWT access token.
 * @param user User information
 * @returns {Promise<string>} JWT token.
 */
export async function createJWTAccessToken(user: JwtUser): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expirationSeconds = validatedEnv.JWT_EXPIRATION_SECONDS;

  return sign(
    {
      sub: String(user.id),
      email: user.email,
      role: user.role,
      iat: now,
      exp: now + expirationSeconds,
    },
    validatedEnv.JWT_SECRET,
  );
}

/**
 * Get user credentials needed for password verification.
 * @param email user email
 * @returns {Promise<UserPasswordHash | null>} if found, null otherwise.
 */
export async function getUserPasswordHash(
  email: string,
): Promise<UserPasswordHash | null> {
  const rows = await db
    .select({
      email: users.email,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Get public user info by email from db.
 * @param email user email
 * @returns {Promise<PublicUser | null>} if found, null otherwise.
 */
export async function getUserByEmail(
  email: string,
): Promise<PublicUser | null> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Get user by id from db.
 * @param id user id
 * @returns {Promise<PublicUser | null>} if found, null otherwise.
 */
export async function getUserById(id: number): Promise<PublicUser | null> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Get push id for a user.
 * @param id user id
 * @returns {Promise<UserPushId | null>} if found, null otherwise.
 */
export async function getUserPushId(id: number): Promise<UserPushId | null> {
  const rows = await db
    .select({
      pushId: users.pushId,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Redeem user access token as part of a db transaction.
 * @param transaction db transaction in which to perform redeem operation.
 * @param accessCode user access code
 * @param email user email
 * @param userId user id
 * @returns {Promise<{ isInitialAccessCode: boolean } | null>} Redeemed access code data or null if invalid.
 */
export async function redeemAccessCode(
  transaction: any,
  accessCode: string,
  email: string,
  userId: number,
): Promise<{ isInitialAccessCode: boolean; accessCodeId: number } | null> {
  const now = new Date();

  const result = await transaction
    .update(accessCodes)
    .set({
      redeemedAt: now,
      redeemedByEmail: email,
      redeemedByUserId: userId,
    })
    .where(
      and(
        eq(accessCodes.code, accessCode),
        isNull(accessCodes.redeemedAt),
        isNull(accessCodes.revokedAt),
        or(isNull(accessCodes.expiresAt), gt(accessCodes.expiresAt, now)),
      ),
    )
    .returning({
      isInitialAccessCode: accessCodes.isInitialAccessCode,
      accessCodeId: accessCodes.id,
    });

  return result[0] ?? null;
}

/**
 * Creates the initial access code only when no access codes exist yet and
 * no initial access code has already been marked.
 * @throws {CreateInitialAccessCodeError} Access code table not empty or create failed
 */
export async function createInitialAccessCode() {
  try {
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`LOCK TABLE ${accessCodes} IN SHARE ROW EXCLUSIVE MODE`,
      );

      const existingAccessCodes = await tx
        .select({ code: accessCodes.code })
        .from(accessCodes)
        .limit(1);

      const existingInitialAccessCode = await tx
        .select({ code: accessCodes.code })
        .from(accessCodes)
        .where(eq(accessCodes.isInitialAccessCode, true))
        .limit(1);

      if (existingInitialAccessCode.length > 0) {
        throw new CreateInitialAccessCodeError(
          "Initial access code already exists.",
        );
      }

      if (existingAccessCodes.length > 0) {
        throw new CreateInitialAccessCodeError(
          "Access code table is non-empty.",
        );
      }

      await tx.insert(accessCodes).values({
        code: validatedEnv.INITIAL_ACCESS_CODE,
        isInitialAccessCode: true,
      });
    });
  } catch (err) {
    if (err instanceof CreateInitialAccessCodeError) {
      throw err;
    }

    throw new CreateInitialAccessCodeError(
      "Failed to create initial access code due to an unexpected error.",
    );
  }
}

/**
 * Get censored access codes.
 * @returns {Promise<CensoredAccessCode[]> } List of access code entries with the access code removed.
 */
export async function getAccessCodes(): Promise<CensoredAccessCode[]> {
  const rows = await db
    .select({
      id: accessCodes.id,
      createdAt: accessCodes.createdAt,
      createdByUserId: accessCodes.createdByUserId,
      redeemedAt: accessCodes.redeemedAt,
      redeemedByEmail: accessCodes.redeemedByEmail,
      redeemedByUserId: accessCodes.redeemedByUserId,
      revokedAt: accessCodes.revokedAt,
      expiresAt: accessCodes.expiresAt,
      isInitialAccessCode: accessCodes.isInitialAccessCode,
    })
    .from(accessCodes);
  return rows;
}

/**
 * Mark access code as revoked.
 * @returns {Promise<boolean> } True if an access code was updated, false otherwise.
 */
export async function markAccessCodeRevoked(id: number): Promise<boolean> {
  const now = new Date();
  const [row] = await db
    .update(accessCodes)
    .set({ revokedAt: now })
    .where(
      and(
        eq(accessCodes.id, id),
        isNull(accessCodes.revokedAt),
        isNull(accessCodes.redeemedAt),
        eq(accessCodes.isInitialAccessCode, false),
      ),
    )
    .returning({ revokedAt: accessCodes.revokedAt });
  return !!row;
}

/**
 * Creates a new access code.
 * @param daysValid Days valid.
 * @returns {Promise<AccessCode>} Access code
 */
export async function generateAccessCode(
  daysValid: number,
  userId: number,
): Promise<ExistingAccessCode | null> {
  const code = createRandomAccessCode();
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(now.getDate() + daysValid);

  const [row] = await db
    .insert(accessCodes)
    .values({
      code,
      createdAt: now,
      createdByUserId: userId,
      expiresAt,
    })
    .returning();

  return row ?? null;
}

/**
 * Checks if a user has a given role.
 *
 * @param userId user id
 * @param role role to check
 * @returns {Promise<boolean>} True if user has role, False otherwise.
 */
export async function checkUserRole(
  userId: number,
  role: UserRole,
): Promise<boolean | null> {
  const rows = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const user = rows[0];
  if (!user) return null;

  return user.role === role;
}

function createRandomAccessCode(): AccessCode {
  const value = crypto
    .randomUUID()
    .replace(/-/g, "")
    .slice(0, 12)
    .toUpperCase();
  return `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8, 12)}` as AccessCode;
}

/**
 * Checks updates a user with a given role.
 *
 * @param userId user id
 * @param role new user role
 * @returns {Promise<UserRoleUpdateResult | null>} Updated user and previous role on success, null on failure.
 */
export async function updateUserRole(
  userId: number,
  role: UserRole,
): Promise<UserRoleUpdateResult | null> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`LOCK TABLE ${users} IN SHARE ROW EXCLUSIVE MODE`);

    const [preUser] = await tx
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!preUser) {
      return null;
    }

    if (preUser.role === "admin" && role !== "admin") {
      const [adminCount] = await tx
        .select({ count: count() })
        .from(users)
        .where(eq(users.role, "admin"));

      if (adminCount.count < 2) {
        throw new DemoteOnlyAdminError();
      }
    }

    const [row] = await tx
      .update(users)
      .set({ role })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      });

    if (!row) {
      return null;
    }

    return {
      user: row,
      previousRole: preUser.role,
    };
  });
}

/**
 * Deletes a user from db.
 *
 * @param userId user id
 * @returns {Promise<PublicUser | null>} Deleted user object on success, null on failure.
 */
export async function dropUser(userId: number): Promise<PublicUser | null> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`LOCK TABLE ${users} IN SHARE ROW EXCLUSIVE MODE`);

    const [preUser] = await tx
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!preUser) {
      return null;
    }

    if (preUser.role === "admin") {
      const [adminCount] = await tx
        .select({ count: count() })
        .from(users)
        .where(eq(users.role, "admin"));

      if (adminCount.count < 2) {
        throw new DeleteOnlyAdminError();
      }
    }

    const [row] = await tx
      .delete(users)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      });

    return row ?? null;
  });
}

/**
 * Returns all users from db.
 *
 * @returns {Promise<PublicUser[]>} List of users.
 */
export async function getUsers(): Promise<PublicUser[]> {
  return await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    })
    .from(users);
}
