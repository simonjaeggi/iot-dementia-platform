import { z } from "zod";

export const USER_ROLE_VALUES = ["user", "admin"];
export type UserRole = (typeof USER_ROLE_VALUES)[number];
export const UserRoleSchema = z.enum(USER_ROLE_VALUES);

export const UserSchema = z.object({
  id: z.number().int(),
  email: z.email(),
  name: z.string(),
  role: UserRoleSchema,
});

export type User = z.infer<typeof UserSchema>;
export const UsersResponseSchema = z.array(UserSchema);

export const UserPushIdSchema = z.object({
  pushId: z.string(),
});

export type UserPushId = z.infer<typeof UserPushIdSchema>;
