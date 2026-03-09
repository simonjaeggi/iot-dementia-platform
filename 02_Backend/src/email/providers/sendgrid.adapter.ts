import sgMail = require("@sendgrid/mail");
import type {
  EmailMessage,
  EmailSendResult,
  EmailService,
} from "../email.types";

type SendGridEmailConfig = {
  apiKey: string;
  fromEmail: string;
  fromName: string;
};

export class SendGridEmailAdapter implements EmailService {
  constructor(private readonly config: SendGridEmailConfig) {
    sgMail.setApiKey(config.apiKey);
  }

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

    return {
      provider: "sendgrid",
      messageId: response.headers["x-message-id"],
    };
  }
}
