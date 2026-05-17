import { PageLayout } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
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
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useAuth } from "@/auth/use-auth";
import { labelToTitleCase } from "@/lib/detail-formatters";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  axiosInstance,
  endpoints,
  getAxiosErrorMessage,
  UserSchema,
  UserPushIdSchema,
} from "@/lib/api";
import { toast } from "sonner";
import { useState } from "react";

export function MyAccount() {
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth();
  const [pushId, setPushId] = useState<string | null>(null);
  const [accountPendingDelete, setAccountPendingDelete] = useState(false);
  const fallback = isLoading
    ? "Loading account details..."
    : "Account details are unavailable.";

  const pushIdQuery = useQuery({
    queryKey: ["me", "push-id"],
    queryFn: async () => {
      const response = await axiosInstance.get(endpoints.auth.myPushId);
      return UserPushIdSchema.parse(response.data).pushId;
    },
    enabled: false,
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await axiosInstance.delete(endpoints.auth.deleteMe);
      return UserSchema.parse(response.data);
    },
    onSuccess: (deletedUser) => {
      queryClient.setQueryData(["me"], null);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success(`User ${deletedUser.name} deleted successfully`);
    },
    onError: (error) =>
      toast.error(getAxiosErrorMessage(error, "Failed to delete user.")),
  });

  async function handleShowPushId() {
    const result = await pushIdQuery.refetch();
    if (result.isError) {
      toast.error(
        getAxiosErrorMessage(result.error, "Failed to load push ID."),
      );
      return;
    }
    if (result.data) {
      setPushId(result.data);
    }
  }

  function handleConfirmDelete() {
    deleteMutation.mutate();
    setAccountPendingDelete(false);
  }

  return (
    <PageLayout title="My Account" contentClassName="flex flex-col gap-4">
      {!user ? (
        <div className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-sm">
          {fallback}
        </div>
      ) : (
        <div className="max-w-xl overflow-hidden rounded-lg border">
          <Table>
            <TableBody>
              <TableRow></TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">
                  Your name
                </TableCell>
                <TableCell className="font-medium">{user.name}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">
                  Your E-Mail
                </TableCell>
                <TableCell className="font-medium">{user.email}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">
                  Your Role
                </TableCell>
                <TableCell className="font-medium">
                  {labelToTitleCase(user.role)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {user ? (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleShowPushId}
            disabled={pushIdQuery.isFetching}
          >
            Show push ID
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setAccountPendingDelete(true)}
            disabled={deleteMutation.isPending}
          >
            Delete account
          </Button>
        </div>
      ) : null}

      <AlertDialog
        open={accountPendingDelete}
        onOpenChange={setAccountPendingDelete}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {user?.name} ({user?.email})?
              This action cannot be undone.
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
        open={pushId !== null}
        onOpenChange={(open) => {
          if (!open) setPushId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Push ID</AlertDialogTitle>
            <AlertDialogDescription>
              Use this so setup push notifications. Don't share it with anyone,
              If someone has access to this, they can receive your push
              notifications.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-muted/50 rounded-md border p-3 text-center font-mono text-sm break-all">
            {pushId}
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setPushId(null)}>
              Done
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
