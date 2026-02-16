import z from "zod";
import { AccessCodeSchema } from "./access-code.schema";
import { PasswordSchema } from "./password.schema";

export const RegisterUserSchema = z.object({
  accessCode: AccessCodeSchema,
  email: z.email(),
  password: PasswordSchema,
  name: z.string().min(1)
});
export type RegisterUserDto = z.infer<typeof RegisterUserSchema>;
