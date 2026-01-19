import z from "zod";
import { AccessCodeSchema } from "./access-code.schema";

export const RegisterUserSchema = z.object({
  accessCode: AccessCodeSchema,
  email: z.email(),
  password: z.string().min(1),
});
export type RegisterUserDto = z.infer<typeof RegisterUserSchema>;
