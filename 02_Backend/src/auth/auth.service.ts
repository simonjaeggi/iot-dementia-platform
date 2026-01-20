import { sign } from "hono/jwt";
import { LoginUserDto } from "./zod/login-user.schema";
import { RegisterUserDto } from "./zod/register-user.schema";
import { users } from "../db/schema";
import { db } from "../db/db";
import { ExistingUser, NewUser } from "../db/types";
import { HTTPException } from "hono/http-exception";
import { DatabaseError } from "pg";
import { DrizzleQueryError } from "drizzle-orm/errors";
import { eq } from "drizzle-orm";

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
  // todo: check if access code is valid
  const passwordHash = await Bun.password.hash(data.password);
  const newUser: NewUser = {
    name: data.name,
    email: data.email,
    passwordHash: passwordHash,
  };
  try {
    await db.insert(users).values(newUser);
  } catch (err) {
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
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET missing");

  const now = Math.floor(Date.now() / 1000);

  const expirationSeconds = Number(
    process.env.JWT_EXPIRATION_SECONDS ?? 60 * 15,
  );
  if (!Number.isFinite(expirationSeconds)) {
    throw new Error("JWT_EXPIRATION_SECONDS must be a number");
  }

  return sign(
    {
      sub: String(user.id),
      email: user.email,
      role: user.role ?? "user",
      iat: now,
      exp: now + expirationSeconds,
    },
    secret,
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
