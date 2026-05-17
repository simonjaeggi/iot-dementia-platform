const { Resend } = require("resend");

import type {
  EmailMessage,
  EmailSendResult,
  EmailService,
} from "../email.types";

type ResendEmailConfig = {
  apiKey: string;
  fromEmail: string;
  fromName: string;
};

/**
 * Email service adapter for Resend.
 */
export class ResendEmailAdapter implements EmailService {
  private readonly resend: any;

  constructor(private readonly config: ResendEmailConfig) {
    this.resend = new Resend(config.apiKey);
  }

  /**
   * Sends an email through Resend.
   * @param message Email message
   * @returns provider, message id
   */
  async send(message: EmailMessage): Promise<EmailSendResult> {
    const emailBody = message.html
      ? { html: message.html, text: message.text }
      : { text: message.text ?? "" };

    const response = await this.resend.emails.send({
      from: `${this.config.fromName} <${this.config.fromEmail}>`,
      to: message.to,
      subject: message.subject,
      ...emailBody,
    });

    if (response.error) {
      throw new Error(`Resend failed to send email: ${response.error.message}`);
    }

    return {
      provider: "resend",
      messageId: response.data?.id,
    };
  }
}
