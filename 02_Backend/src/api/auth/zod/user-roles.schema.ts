import z from "zod";

export const userRoles = ["user", "admin"] as const;

export const UserRoleSchema = z.enum(userRoles);

export type UserRoleDto = z.infer<typeof UserRoleSchema>;
export type UserRole = (typeof userRoles)[number];
