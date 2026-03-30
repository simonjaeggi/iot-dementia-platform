import z from "zod"
export const NtfyResponseSchema = z.object({
  id: z.string().min(1),
  time: z.coerce.number().int().positive(),
  expires: z.coerce.number().int().positive(),
  event: z.literal("message"),
  topic: z.string().min(1),
  message: z.string().optional(),
});

export type NtfyResponseDto = z.infer<typeof NtfyResponseSchema>