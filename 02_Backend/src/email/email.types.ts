import { z } from "zod";

export const EmailProviderSchema = z.enum(["sendgrid"]);

export type EmailProvider = z.infer<typeof EmailProviderSchema>;

export type EmailMessage = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

export type EmailSendResult = {
  provider: EmailProvider;
  messageId?: string;
};

export interface EmailService {
  send(message: EmailMessage): Promise<EmailSendResult>;
}
