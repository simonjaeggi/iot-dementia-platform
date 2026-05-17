import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { PageLayout } from "@/components/page-layout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AccessCodeSchema,
  AccessCodesResponseSchema,
  axiosInstance,
  endpoints,
  getAxiosErrorMessage,
} from "@/lib/api";
import { AccessCodesTable } from "./access-codes-table";

const CreateAccessCodeResponseSchema = AccessCodeSchema.extend({
  code: z.string(),
});

export function AccessCodes() {
  const queryClient = useQueryClient();
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const accessCodesQuery = useQuery({
    queryKey: ["access-codes"],
    queryFn: async () => {
      const response = await axiosInstance.get(endpoints.auth.accessCodes);
      return AccessCodesResponseSchema.parse(response.data);
    },
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async (daysValid: number) => {
      const response = await axiosInstance.post(
        endpoints.auth.createAccessCode,
        { daysValid },
      );
      return CreateAccessCodeResponseSchema.parse(response.data);
    },
    onSuccess: (created) => {
      setGeneratedCode(created.code);
      queryClient.invalidateQueries({ queryKey: ["access-codes"] });
      toast.success("Access code created successfully");

    },
    onError: (error) =>
      toast.error(getAxiosErrorMessage(error, "Failed to create access code.")),
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.post(endpoints.auth.revokeAccessCode, { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-codes"] });
      toast.success("Revoked access code successfully");
    },
    onError: (error) =>
      toast.error(getAxiosErrorMessage(error, "Failed to revoke access code.")),
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const daysValid = Number(formData.get("daysValid") ?? "");
    if (!Number.isInteger(daysValid) || daysValid < 1 || daysValid > 14) {
      toast.error("Days valid must be between 1 and 14.");
      return;
    }
    createMutation.mutate(daysValid);
  }

  return (
    <PageLayout title="Access Codes" contentClassName="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        Access codes that have been issued. The code is only shown during
        creation.
      </p>

      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="daysValid"
            className="text-muted-foreground text-xs font-medium"
          >
            Days valid
          </label>
          <Input
            id="daysValid"
            name="daysValid"
            type="number"
            min={1}
            max={14}
            defaultValue={7}
            className="w-32"
          />
        </div>
        <Button type="submit" size="sm" disabled={createMutation.isPending}>
          Generate code
        </Button>
      </form>

      <AccessCodesTable
        codes={accessCodesQuery.data ?? []}
        isLoading={accessCodesQuery.isLoading}
        isError={accessCodesQuery.isError}
        onRevoke={(id) => revokeMutation.mutate(id)}
        errorMessage={getAxiosErrorMessage(
          accessCodesQuery.error,
          "Failed to load access codes.",
        )}
      />

      <AlertDialog
        open={generatedCode !== null}
        onOpenChange={(open) => {
          if (!open) setGeneratedCode(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Access code generated</AlertDialogTitle>
            <AlertDialogDescription>
              Note this code to share with a new caregiver, it will not be
              possible to show it again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-muted/50 rounded-md border p-3 text-center font-mono text-lg tracking-wider">
            {generatedCode}
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setGeneratedCode(null)}>
              Done
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
