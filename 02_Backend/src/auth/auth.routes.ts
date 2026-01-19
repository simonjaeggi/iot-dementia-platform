import { Hono } from 'hono'
import { login, logout } from './auth.controller'

const auth = new Hono()

auth.post('/login', login)
auth.post('/logout', logout)

export default auth
