import z from 'zod';
import { PasswordSchema } from './password.schema';

export const LoginUserSchema = z.object({
  email: z.email(),
  password: PasswordSchema,
})
export type LoginUserDto = z.infer<typeof LoginUserSchema>
