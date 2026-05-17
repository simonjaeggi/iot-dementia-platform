import z from "zod";

export const JwtPayloadSchema = z.object({
  sub: z.coerce.number().int().positive(),
  email: z.email(),
});

export type JwtPayloadDto = z.infer<typeof JwtPayloadSchema>;
