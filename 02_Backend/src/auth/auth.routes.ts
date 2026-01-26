import { Hono } from "hono"
import { jwt } from "hono/jwt"
import { login, logout, me, register } from "./auth.controller"
import { jwtOptions } from "./jwt.config"


const auth = new Hono()

auth.use("/me", jwt(jwtOptions))
auth.use("/logout", jwt(jwtOptions))

auth.post("/login", login)
auth.post("/logout", logout)
auth.post("/register", register)
auth.get("/me", me)

export default auth
