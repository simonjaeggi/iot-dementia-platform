import { z } from "zod";

const USER_ROLE_VALUES = ["user", "admin"];
export type UserRole = (typeof USER_ROLE_VALUES)[number];
export const UserRoleSchema = z.enum(USER_ROLE_VALUES);

export const UserSchema = z.object({
  id: z.number().int(),
  email: z.email(),
  name: z.string(),
  role: UserRoleSchema,
});

export type User = z.infer<typeof UserSchema>;
