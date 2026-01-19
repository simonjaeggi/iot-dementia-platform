import { Context } from "hono"
import { HTTPException } from "hono/http-exception"
import { loginUser, registerUser } from "./auth.service"
import { LoginUserSchema } from "./zod/login-user.schema"
import { RegisterUserSchema } from "./zod/register-user.schema"

export async function login(c: Context) {
  const body = await c.req.json()
  const dto = LoginUserSchema.parse(body)

  return c.json(await loginUser(dto))
}

export async function logout(c: Context) {
  throw new HTTPException(501, { message: "Not implemented" })
}

export async function register(c: Context) {
  const body = await c.req.json()
  console.log(body);
  
  const dto = RegisterUserSchema.parse(body)

  return c.json(await registerUser(dto))
}

export async function me(c: Context) {
  throw new HTTPException(501, { message: "Not implemented" })
}
