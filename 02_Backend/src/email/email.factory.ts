import { validatedEnv } from "../env-validation";
import type { EmailService } from "./email.types";
import { SendGridEmailAdapter } from "./providers/sendgrid.adapter";

export function createEmailService(): EmailService {
  switch (validatedEnv.EMAIL_PROVIDER) {
    case "sendgrid": {
      return new SendGridEmailAdapter({
        apiKey: validatedEnv.SENDGRID_API_KEY,
        fromEmail: validatedEnv.FROM_EMAIL,
        fromName: validatedEnv.FROM_EMAIL_NAME,
      });
    }
  }
}
