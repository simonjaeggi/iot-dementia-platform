import z from "zod";

export const JwtPayloadSchema = z.object({
  sub: z.coerce.number().int().positive(),
});

export type JwtPayloadDto = z.infer<typeof JwtPayloadSchema>;
