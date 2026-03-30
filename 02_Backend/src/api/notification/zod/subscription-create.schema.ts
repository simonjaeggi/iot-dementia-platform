import { z } from "zod";
import { FingerprintSchema } from "../../device/zod/cert-fingerprint.schema";
import { DeliveryMethodSchema, DetailLevelSchema } from "./delivery.schema";
import { getThresholdConfigSchemaForSubscriptionType } from "./threshold.schema";
import {
  SubscriptionTypeSchema,
  supportsDeviceScopedSubscriptions,
} from "./subscription.types";

export const CreateSubscriptionSchema = z
  .object({
    type: SubscriptionTypeSchema,
    deliveryMethod: DeliveryMethodSchema,
    detailLevel: DetailLevelSchema,
    deviceFingerprint: FingerprintSchema.optional().nullable().default(null),
    thresholdConfig: z.unknown().optional().nullable().default(null),
  })
  .strict()
  .transform((value, transformContext) => {
    if (
      value.deviceFingerprint &&
      !supportsDeviceScopedSubscriptions(value.type)
    ) {
      transformContext.addIssue({
        code: "custom",
        path: ["deviceFingerprint"],
        message: "This subscription type does not support device selection.",
      });

      return z.NEVER;
    }

    const result = getThresholdConfigSchemaForSubscriptionType(
      value.type,
    ).safeParse(value.thresholdConfig ?? null);

    if (!result.success) {
      transformContext.addIssue({
        code: "custom",
        path: ["thresholdConfig"],
        message: result.error.issues[0]?.message ?? "Invalid threshold config.",
      });

      return z.NEVER;
    }

    return {
      ...value,
      thresholdConfig: result.data,
    };
  });

export type CreateSubscriptionDto = z.infer<typeof CreateSubscriptionSchema>;
