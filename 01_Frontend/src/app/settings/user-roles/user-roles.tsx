import { PageLayout } from "@/components/page-layout";
import { UserRolesTable } from "./user-roles-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  axiosInstance,
  endpoints,
  getAxiosErrorMessage,
  UserSchema,
  UsersResponseSchema,
  type User,
  type UserRole,
} from "@/lib/api";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { labelToTitleCase } from "@/lib/detail-formatters";

type PendingRoleChange = {
  user: User;
  role: UserRole;
};

export function UserRoles() {
  const queryClient = useQueryClient();
  const [userPendingDelete, setUserPendingDelete] = useState<User | null>(null);
  const [pendingRoleChange, setPendingRoleChange] =
    useState<PendingRoleChange | null>(null);
  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await axiosInstance.get(endpoints.auth.users);
      return UsersResponseSchema.parse(response.data);
    },
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await axiosInstance.delete(endpoints.auth.deleteUser, {
        data: { userId },
      });
      return UserSchema.parse(response.data);
    },
    onSuccess: (deletedUser) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(`User ${deletedUser.name} deleted successfully`);
    },
    onError: (error) =>
      toast.error(getAxiosErrorMessage(error, "Failed to delete user.")),
  });

  const roleChangeMutation = useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: number;
      role: UserRole;
    }) => {
      const response = await axiosInstance.put(endpoints.auth.changeUserRole, {
        userRole: role,
        userId,
      });

      return UserSchema.parse(response.data);
    },
    onSuccess: (changedUser) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(
        `User role of ${changedUser.name} changed to ${changedUser.role}.`,
      );
    },
    onError: (error) =>
      toast.error(getAxiosErrorMessage(error, "Failed to change user role.")),
  });

  function handleConfirmDelete() {
    if (!userPendingDelete) return;

    deleteMutation.mutate(userPendingDelete.id);
    setUserPendingDelete(null);
  }

  function handleConfirmRoleChange() {
    if (!pendingRoleChange) return;

    roleChangeMutation.mutate({
      userId: pendingRoleChange.user.id,
      role: pendingRoleChange.role,
    });
    setPendingRoleChange(null);
  }

  return (
    <PageLayout title="Users & Roles" contentClassName="flex flex-col gap-4">
      <AlertDialog
        open={userPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setUserPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {userPendingDelete?.name} (
              {userPendingDelete?.email})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={"destructive"}
              onClick={handleConfirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingRoleChange !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRoleChange(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change user role?</AlertDialogTitle>
            <AlertDialogDescription>
              Change {pendingRoleChange?.user.name} (
              {pendingRoleChange?.user.email}) from{" "}
              {pendingRoleChange
                ? labelToTitleCase(pendingRoleChange.user.role)
                : ""}{" "}
              to{" "}
              {pendingRoleChange
                ? labelToTitleCase(pendingRoleChange.role)
                : ""}
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRoleChange}>
              Change role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UserRolesTable
        users={usersQuery.data ?? []}
        isLoading={usersQuery.isLoading}
        isError={usersQuery.isError}
        errorMessage={getAxiosErrorMessage(
          usersQuery.error,
          "Failed to load users.",
        )}
        onUserRoleChange={(user, role) => {
          if (user.role === role) return;
          setPendingRoleChange({ user, role });
        }}
        onUserDelete={setUserPendingDelete}
      />
    </PageLayout>
  );
}
