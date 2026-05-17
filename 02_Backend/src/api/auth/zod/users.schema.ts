import z from 'zod';
import { AccessCodeSchema } from './access-code.schema';


export const PasswordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(64, "Password must be at most 64 characters")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number")
  .regex(/[^A-Za-z0-9]/, "Password must contain a special character")

export const LoginUserSchema = z.object({
  email: z.email(),
  password: PasswordSchema,
})
export type LoginUserDto = z.infer<typeof LoginUserSchema>

export const RegisterUserSchema = z.object({
  accessCode: AccessCodeSchema,
  email: z.email(),
  password: PasswordSchema,
  name: z.string().min(1)
});
export type RegisterUserDto = z.infer<typeof RegisterUserSchema>;


export const DeleteUserSchema = z.object({
  userId: z.number().positive().int(),
})

export type DeleteUserDto = z.infer<typeof DeleteUserSchema>;