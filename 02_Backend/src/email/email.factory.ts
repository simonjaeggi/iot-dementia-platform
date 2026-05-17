import { validatedEnv } from "../env-validation";
import type { EmailService } from "./email.types";
import { ResendEmailAdapter } from "./providers/resend.adapter";
import { SendGridEmailAdapter } from "./providers/sendgrid.adapter";

function requireEnvValue(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

/**
 * Factory function that returns a new .env specified email provider object.
 * @returns {EmailService} EmailService provider
 */
export function createEmailService(): EmailService {
  switch (validatedEnv.EMAIL_PROVIDER) {
    case "sendgrid": {
      return new SendGridEmailAdapter({
        apiKey: requireEnvValue(
          validatedEnv.SENDGRID_API_KEY,
          "SENDGRID_API_KEY",
        ),
        fromEmail: validatedEnv.FROM_EMAIL,
        fromName: validatedEnv.FROM_EMAIL_NAME,
      });
    }
    case "resend": {
      return new ResendEmailAdapter({
        apiKey: requireEnvValue(validatedEnv.RESEND_API_KEY, "RESEND_API_KEY"),
        fromEmail: validatedEnv.FROM_EMAIL,
        fromName: validatedEnv.FROM_EMAIL_NAME,
      });
    }
  }
}
