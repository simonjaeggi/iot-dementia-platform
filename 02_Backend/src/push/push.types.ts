import { z } from "zod";

export const PushProviderSchema = z.enum(["ntfy"]);

export type PushProvider = z.infer<typeof PushProviderSchema>;

export type PushMessage = {
  topic: string;
  subject: string;
  text?: string;
  priority: "urgent" | "high" | "default" | "low" | "min"
  tags?: string;
  clickUrl?: string;
};

export type PushSendResult = {
  provider: PushProvider;
  messageId?: string;
};

export interface PushService {
  send(message: PushMessage): Promise<PushSendResult>;
}