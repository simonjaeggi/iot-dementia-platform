import { Hono } from "hono";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { validatedEnv, validateEnv } from "./env-validation";
import { createInitialAccessCode } from "./api/auth/auth.service";
import { apiRoutes } from "./api/api.routes";
import { sendNotifications } from "./api/notification/notification.transport.service";
import { processStatefulNotifications } from "./api/notification/stateful/stateful-notification.service";
import { CreateInitialAccessCodeError } from "./api/auth/auth.exceptions";

const app = new Hono();
app.use(logger());

validateEnv();

try {
  await createInitialAccessCode();
  console.info("Initial access code created successfully.");
} catch (err) {
  if (err instanceof CreateInitialAccessCodeError) {
      console.warn("Failed to create initial access code. Error: " + err.message);
  }else{
    throw err;
  }
}

app.route("/api", apiRoutes);
app.get("/", (c) => c.text("API running"));

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json(
      {
        message: err.message,
        status: err.status,
      },
      err.status,
    );
  }

  console.error(err);
  return c.json({ message: "Internal Server Error", status: 500 }, 500);
});

Bun.serve({
  port: validatedEnv.PORT,
  hostname: validatedEnv.INTERNAL_HOST,
  fetch: app.fetch,
});

setInterval(async () => {
  try {
    await processStatefulNotifications();
  } catch (error) {
    console.error("Failed to process stateful notifications", error);
  }

  try {
    const result = await sendNotifications();
    if (result.pendingCount === 0) return;
    console.info(
      `Processed ${result.pendingCount} notification transports. Sent ${result.sentCount}, failed ${result.failedCount}.`,
    );

    if (result.failedCount > 0) {
      console.error("Notification transport failures", result.failures);
    }
  } catch (error) {
    console.error("Failed to process pending notifications", error);
  }
}, 10000);

console.log(
  `Listening on http://${validatedEnv.INTERNAL_HOST}:${validatedEnv.PORT}`,
);
