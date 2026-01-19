import { Hono } from 'hono'
import authRoutes from './auth/auth.routes'
import apiRoutes from './api/api.routes'
import { jwt } from 'hono/jwt'
import { logger } from 'hono/logger'
import { publicRoutes } from './public/public.routes'
import { HTTPException } from 'hono/http-exception'

const app = new Hono()
app.use(logger())

app.route('/public', publicRoutes)
app.route('/auth', authRoutes)

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error('JWT_SECRET is missing')

app.use('/api/*', jwt({ secret: JWT_SECRET, cookie: 'authCookie', alg: 'HS256'}))
app.route('/api', apiRoutes)
app.get('/', (c) => c.text('API running'))


app.onError((err, c) => {
  if (err instanceof HTTPException) {
    if (err.status === 401) {
      return c.json({ message: 'Unauthorized' }, 401)
    }
    return err.getResponse()
  }
  console.error(err)
  return c.json({ message: 'Internal Server Error' }, 500)
})


export default app
