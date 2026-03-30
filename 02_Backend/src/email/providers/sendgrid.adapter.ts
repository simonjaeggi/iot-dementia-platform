const sgMail = require("@sendgrid/mail");

import type {
  EmailMessage,
  EmailSendResult,
  EmailService,
} from "../email.types";
import { SendGridResponseSchema } from "../zod/sendgrid-response.schema";

type SendGridEmailConfig = {
  apiKey: string;
  fromEmail: string;
  fromName: string;
};

/**
 * Email service adapter for SendGrid.
 */
export class SendGridEmailAdapter implements EmailService {
  constructor(private readonly config: SendGridEmailConfig) {
    sgMail.setApiKey(config.apiKey);
  }

  /**
   * Sends an email through sendgrid.
   * @param message Email message
   * @returns provider, message id
   */
  async send(message: EmailMessage): Promise<EmailSendResult> {
    const [response] = await sgMail.send({
      to: message.to,
      from: {
        email: this.config.fromEmail,
        name: this.config.fromName,
      },
      subject: message.subject,
      text: message.text || "",
      html: message.html,
    });

    const responseResult = SendGridResponseSchema.safeParse(response);
    if (!responseResult.success) {
      throw new Error("SendGrid returned illegal payload.");
    }

    return {
      provider: "sendgrid",
      messageId: responseResult.data.headers["x-message-id"],
    };
  }
}
