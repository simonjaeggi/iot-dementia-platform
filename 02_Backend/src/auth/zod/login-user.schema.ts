import z from 'zod';

export const LoginUserSchema = z.object({
  email: z.email(),
  password: z.string().min(10),
})
export type LoginUserDto = z.infer<typeof LoginUserSchema>
