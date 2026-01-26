import { Hono } from 'hono'
import authRoutes from './auth/auth.routes'
import apiRoutes from './api/api.routes'
import { jwt } from 'hono/jwt'
import { logger } from 'hono/logger'
import { publicRoutes } from './public/public.routes'
import { HTTPException } from 'hono/http-exception'
import { jwtOptions } from './auth/jwt.config'
import { validateEnv } from './env-validation'
import { createInitialAccessCode } from './auth/auth.service'


const app = new Hono()
validateEnv()
createInitialAccessCode()

app.use(logger())

app.route('/public', publicRoutes)
app.route('/auth', authRoutes)

app.use('/api/*', jwt(jwtOptions))
app.route('/api', apiRoutes)
app.get('/', (c) => c.text('API running'))


app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json(
      {
        message: err.message,
        status: err.status,
      },
      err.status
    )
  }

  console.error(err)
  return c.json({ message: "Internal Server Error", status: 500 }, 500)
})

export default app
