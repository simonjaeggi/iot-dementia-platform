import { sign } from "hono/jwt";
import { LoginUserDto } from "./zod/login-user.schema";
import { JwtUser } from "./auth.types";
import { RegisterUserDto } from "./zod/register-user.schema";
import { users } from "../db/schema";
import { db } from "../db/db";
import { NewUser } from "../db/types";
import { HTTPException } from "hono/http-exception";
import { DatabaseError } from "pg";
import { DrizzleQueryError } from "drizzle-orm/errors"


export async function loginUser(data: LoginUserDto) {}

export async function registerUser(data: RegisterUserDto) {
  // todo: check if access code is valid
  const passwordHash = await Bun.password.hash(data.password);
  const newUser: NewUser = {
    name: data.name,
    email: data.email,
    passwordHash: passwordHash,
  };
  try {
    await db.insert(users).values(newUser)
  } catch (err) {
    // Drizzle wraps driver errors
    if (err instanceof DrizzleQueryError && err.cause instanceof DatabaseError) {
      // Postgres unique violation
      if (err.cause.code === "23505" && err.cause.constraint === "users_email_unique") {
        throw new HTTPException(409, { message: "Email already in use" })
      }
    }
    throw new HTTPException(500, { message: "Failed to create user" })
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
