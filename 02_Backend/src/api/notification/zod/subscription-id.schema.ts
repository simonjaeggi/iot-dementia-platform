import { z } from "zod";

export const SubscriptionIdSchema = z.coerce.number().int().positive();

export type SubscriptionId = z.infer<typeof SubscriptionIdSchema>;
