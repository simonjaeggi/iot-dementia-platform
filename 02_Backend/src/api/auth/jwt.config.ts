import { validatedEnv } from "../../env-validation"

export const jwtOptions = {
  secret: validatedEnv.JWT_SECRET,
  cookie: "authCookie",
  alg: "HS256",
} as const