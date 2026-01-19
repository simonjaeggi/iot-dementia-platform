import { Hono } from 'hono'
import { login, logout, me, register } from './auth.controller'

const auth = new Hono()

auth.post('/login', login)
auth.post('/logout', logout)
auth.post('/register', register)
auth.get('/me', me)


export default auth
