import z from "zod";

export const userRoles = ["user", "admin"] as const;

export const UserRoleSchema = z.enum(userRoles, "User role unknown.");

export type UserRoleDto = z.infer<typeof UserRoleSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UpdateUserRoleSchema = z.object({
    userRole: UserRoleSchema,
    userId: z.number().int().positive(),
});

