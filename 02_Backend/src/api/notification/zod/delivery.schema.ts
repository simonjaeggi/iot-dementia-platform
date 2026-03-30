import { z } from "zod";

export const DeliveryMethodSchema = z.enum(["email", "push"]);

export type DeliveryMethod = z.infer<typeof DeliveryMethodSchema>;

export const DetailLevelSchema = z.enum(["none", "title", "full"]);

export type DetailLevel = z.infer<typeof DetailLevelSchema>;
