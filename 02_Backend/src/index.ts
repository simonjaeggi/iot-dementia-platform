import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { HTTPException } from 'hono/http-exception'
import { validatedEnv, validateEnv } from './env-validation'
import {deviceRoutes} from './api/device/device.routes'
import { createInitialAccessCode } from './api/auth/auth.service'
import {authRoutes} from './api/auth/auth.routes'
import { apiRoutes } from './api/api.routes'


const app = new Hono()
validateEnv()
createInitialAccessCode()

app.use(logger())

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


Bun.serve({
  port: validatedEnv.PORT,
  hostname: validatedEnv.HOST,
  fetch: app.fetch,
})

console.log(`Listening on http://${validatedEnv.HOST}:${validatedEnv.PORT}`)