import { PushMessage, PushSendResult, PushService } from "../push.types";
import { NtfyResponseSchema } from "../zod/ntfy-response.schema";

type NtfyPushConfig = {
  url: string;
};

export class NtfyPushAdapter implements PushService {
  url: string = "";
  constructor(private readonly config: NtfyPushConfig) {
    this.url = config.url;
    if (!this.url.endsWith("/")) this.url = this.url + "/";
  }

  async send(message: PushMessage): Promise<PushSendResult> {
    const payload = {
      method: "POST",
      body: message.text,
      headers: {
        Title: message.subject,
        Priority: message.priority,
        ...(message.clickUrl !== undefined && { Click: message.clickUrl }),
        ...(message.tags !== undefined && { tags: message.tags }),
      },
    };

    const response = await fetch(`${this.url}${message.topic}`, payload);

    if (!response.ok) {
      throw new Error(`Failed to publish to ntfy: ${response.status}`);
    }
    const result = await response.json();

    const bodyResult = NtfyResponseSchema.safeParse(result);
    if (!bodyResult.success) throw new Error("Ntfy returned illegal payload.");

    return {
      provider: "ntfy",
      messageId: bodyResult.data.id,
    };
  }
}
