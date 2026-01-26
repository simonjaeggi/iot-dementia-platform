import { sign } from "hono/jwt";
import { LoginUserDto } from "./zod/login-user.schema";
import { RegisterUserDto } from "./zod/register-user.schema";
import { accessCodes, users } from "../db/schema";
import { db } from "../db/db";
import { ExistingUser, NewUser } from "../db/types";
import { HTTPException } from "hono/http-exception";
import { DatabaseError } from "pg";
import { DrizzleQueryError } from "drizzle-orm/errors";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { validatedEnv } from "../env-validation";

type JwtUser = Pick<ExistingUser, "id" | "email" | "role">;

export async function loginUser(data: LoginUserDto) {
  const dbUser = await getUserByEmail(data.email);
  if (
    !dbUser ||
    !(await Bun.password.verify(data.password, dbUser.passwordHash))
  ) {
    throw new HTTPException(401, { message: "Invalid Credentials" });
  }
  return createAccessToken({
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role,
  });
}

export async function registerUser(data: RegisterUserDto) {
  const passwordHash = await Bun.password.hash(data.password);

  const newUser: NewUser = {
    name: data.name,
    email: data.email,
    passwordHash,
  };

  try {
    await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values(newUser)
        .returning({ id: users.id, email: users.email });

      const redeemed = await redeemAccessCode(
        tx,
        data.accessCode,
        user.email,
        user.id,
      );

      if (!redeemed) {
        throw new HTTPException(401, { message: "Invalid Access Code" });
      }
    });
  } catch (err) {
    if (err instanceof HTTPException) throw err;

    if (
      err instanceof DrizzleQueryError &&
      err.cause instanceof DatabaseError
    ) {
      if (
        err.cause.code === "23505" &&
        err.cause.constraint === "users_email_unique"
      ) {
        throw new HTTPException(409, { message: "Email already in use" });
      }
    }

    throw new HTTPException(500, { message: "Failed to create user" });
  }
}

export async function createAccessToken(user: JwtUser) {
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

export async function getUserByEmail(
  email: string,
): Promise<ExistingUser | null> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return rows[0] ?? null;
}

export async function getUserById(id: number): Promise<ExistingUser | null> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

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

// async function verifyJWToken(token:string){
//   const decodedToken = await verify(token, jwtOptions.secret, jwtOptions.alg);
// }

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

    throw err;
  }
}
