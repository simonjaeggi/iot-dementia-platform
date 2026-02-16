import { Hono } from "hono"
import { jwt } from "hono/jwt"
import { login, logout, me, register } from "./auth.controller"
import { jwtOptions } from "./jwt.config"


export const authRoutes = new Hono()

authRoutes.use("/me", jwt(jwtOptions))
authRoutes.use("/logout", jwt(jwtOptions))

authRoutes.post("/login", login)
authRoutes.post("/logout", logout)
authRoutes.post("/register", register)
authRoutes.get("/me", me)
