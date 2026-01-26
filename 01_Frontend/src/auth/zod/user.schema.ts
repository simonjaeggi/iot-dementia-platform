import { z } from "zod";

export const UserSchema = z.object({
  id: z.number().int(),
  email: z.email(),
  name: z.string(),
  role: z.enum(["admin", "user"]),
})

export type User = z.infer<typeof UserSchema>;
