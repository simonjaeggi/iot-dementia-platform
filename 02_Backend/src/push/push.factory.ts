import { validatedEnv } from "../env-validation";
import { NtfyPushAdapter } from "./providers/ntfy.adapter";
import { PushService } from "./push.types";


export function createPushService(): PushService {
  switch (validatedEnv.PUSH_PROVIDER) {
    case "ntfy": {
      return new NtfyPushAdapter({
        url: validatedEnv.PUSH_PROVIDER_URL,
      });
    }
  }
}
