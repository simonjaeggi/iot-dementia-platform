import { z } from "zod";

export const SendGridResponseSchema = z.object({
  headers: z.object({
    "x-message-id": z.string().min(1),
  }),
});

export type SendGridResponseDto = z.infer<typeof SendGridResponseSchema>;
