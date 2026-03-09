import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { HTTPException } from 'hono/http-exception'
import { validatedEnv, validateEnv } from './env-validation'
import { createInitialAccessCode } from './api/auth/auth.service'
import { apiRoutes } from './api/api.routes'
import { sendEmailNotifications } from './api/notification/notification.transport.service'


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
  hostname: validatedEnv.INTERNAL_HOST,
  fetch: app.fetch,
})

setInterval(async () => {  
  try {
    await sendEmailNotifications()
  } catch (error) {
    console.error("Failed to process pending email notifications", error)
  }
}, 10000)

console.log(`Listening on http://${validatedEnv.INTERNAL_HOST}:${validatedEnv.PORT}`)
