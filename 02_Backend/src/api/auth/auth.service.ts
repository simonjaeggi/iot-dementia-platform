import { sign } from "hono/jwt";
import { LoginUserDto } from "./zod/login-user.schema";
import { RegisterUserDto } from "./zod/register-user.schema";
import { accessCodes, users } from "../../db/schema";
import { db } from "../../db/db";
import { ExistingUser, NewUser } from "../../db/types";
import { DatabaseError } from "pg";
import { DrizzleQueryError } from "drizzle-orm/errors";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { validatedEnv } from "../../env-validation";
import { UserRole } from "./zod/user-roles.schema";
import {
  CreateInitialAccessCodeError,
  CreateUserFailedError,
  EmailAlreadyInUseError,
  InvalidAccessCodeError,
} from "./auth.exceptions";

type JwtUser = Pick<ExistingUser, "id" | "email" | "role">;
export type PublicUser = Pick<ExistingUser, "id" | "email" | "name" | "role">;
export type LoginSuccess = {
  token: string;
  user: Pick<ExistingUser, "id" | "email">;
};

/**
 * Authenticate user and return jwt access token if successful.
 * @param data User login information {email, password}
 * @returns {Promise<LoginSuccess | null>} LoginSuccess if user authentication successful, otherwise null.
 */
export async function loginUser(
  data: LoginUserDto,
): Promise<LoginSuccess | null> {
  const dbUser = await getUserByEmail(data.email);
  if (
    !dbUser ||
    !(await Bun.password.verify(data.password, dbUser.passwordHash))
  ) {
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
 * Register user and return public user info if successful.
 * @param data User registration information {accesscode, email, password, name}
 * @returns {Promise<PublicUser>} User info for the created user.
 * @throws {InvalidAccessCodeError} Provided access code invalid
 * @throws {EmailAlreadyInUseError} Email already in use
 * @throws {CreateUserFailedError} Failed to create user in db
 */
export async function registerUser(
  data: RegisterUserDto,
): Promise<PublicUser> {
  const passwordHash = await Bun.password.hash(data.password);

  const newUser: NewUser = {
    name: data.name,
    email: data.email,
    passwordHash,
  };

  try {
    const createdUser = await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values(newUser)
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
        });

      const redeemed = await redeemAccessCode(
        tx,
        data.accessCode,
        user.email,
        user.id,
      );

      if (!redeemed) {
        throw new InvalidAccessCodeError();
      }
      return user;
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
 * Get a user by email from db.
 * @param email user email
 * @returns {Promise<ExistingUser | null>} if found, null otherwise.
 */
export async function getUserByEmail(email: string): Promise<ExistingUser | null> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Get a user by id from db.
 * @param id user id
 * @returns {Promise<ExistingUser | null>} if found, null otherwise.
 */
export async function getUserById(id: number): Promise<ExistingUser | null> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

/**
 * Redeem user access token as part of a db transaction.
 * @param transaction db transaction in which to perform redeem operation.
 * @param accessCode user access code
 * @param email user email
 * @param userId user id
 * @returns {Promise<boolean>} True if access code was redeemed successfully, False otherwise.
 */
export async function redeemAccessCode(
  transaction: any,
  accessCode: string,
  email: string,
  userId: number,
): Promise<boolean> {
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
    .returning({ code: accessCodes.code });

  return result.length === 1;
}

/**
 * Creates the initial access code for the first user. If code already exists, return.
 * @throws {CreateInitialAccessCodeError} Access code could not be created
 */
export async function createInitialAccessCode() {
  try {
    await db.insert(accessCodes).values({
      code: validatedEnv.INITIAL_ACCESS_CODE,
    });
  } catch (err) {
    if (
      err instanceof DrizzleQueryError &&
      err.cause instanceof DatabaseError &&
      err.cause.code === "23505" &&
      err.cause.constraint === "access_codes_pkey"     
    ) {
      // console.log("Initial Access code already exists.");
      return; 
    }

    throw new CreateInitialAccessCodeError();
  }
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
