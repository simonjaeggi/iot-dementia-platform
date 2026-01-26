import { Context } from "hono";
import { getUserById, loginUser, registerUser } from "./auth.service";
import { LoginUserSchema } from "./zod/login-user.schema";
import { RegisterUserSchema } from "./zod/register-user.schema";
import { setCookie } from "hono/cookie";

export async function login(c: Context) {
  const body = await c.req.json();
  const dto = LoginUserSchema.parse(body);
  const token = await loginUser(dto);

  setCookie(c, "authCookie", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });

  return c.json({ ok: true });
}

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
export async function register(c: Context) {
  const body = await c.req.json();
  console.log(body);

  const dto = RegisterUserSchema.parse(body);

  return c.json(await registerUser(dto));
}

// Function needs to be behind jwt guard!
export async function me(c: Context) {
  const payload = c.get("jwtPayload") as { sub?: string };

  const userId = payload?.sub;
  if (!userId) return c.json(null, 401);

  const user = await getUserById(+userId);
  if (!user) return c.json(null, 401);

  return c.json(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  );
}