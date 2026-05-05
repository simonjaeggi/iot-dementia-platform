import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageLayout } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  axiosInstance,
  CreatePatientSchema,
  endpoints,
  getAxiosErrorMessage,
  PatientResponseSchema,
  UpdatePatientSchema,
  type CreatePatient,
  type UpdatePatient,
} from "@/lib/api";
import { useAuth } from "@/auth/use-auth";

export function Patient() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin";

  const patientQuery = useQuery({
    queryKey: ["patient"],
    queryFn: async () => {
      const response = await axiosInstance.get(endpoints.misc.patient);
      return PatientResponseSchema.parse(response.data).patient;
    },
    retry: false,
  });

  const invalidatePatient = () =>
    queryClient.invalidateQueries({ queryKey: ["patient"] });

  const createMutation = useMutation({
    mutationFn: async (input: CreatePatient) => {
      const response = await axiosInstance.post(endpoints.misc.patient, input);
      return PatientResponseSchema.parse(response.data).patient;
    },
    onSuccess: () => {
      toast.success("Patient created successfully.");
      invalidatePatient();
    },
    onError: (error) =>
      toast.error(getAxiosErrorMessage(error, "Failed to create patient.")),
  });

  const updateMutation = useMutation({
    mutationFn: async (input: UpdatePatient) => {
      const response = await axiosInstance.put(endpoints.misc.patient, input);
      return PatientResponseSchema.parse(response.data).patient;
    },
    onSuccess: () => {
      toast.success("Patient updated successfully.");
      invalidatePatient();
    },
    onError: (error) =>
      toast.error(getAxiosErrorMessage(error, "Failed to update patient.")),
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) return;

    const formData = new FormData(event.currentTarget);
    const candidate = {
      surname: String(formData.get("surname") ?? ""),
      lastname: String(formData.get("lastname") ?? ""),
      birthday: String(formData.get("birthday") ?? ""),
    };

    const schema = patientQuery.data ? UpdatePatientSchema : CreatePatientSchema;
    const result = schema.safeParse(candidate);
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? "Invalid patient.");
      return;
    }

    if (patientQuery.data) {
      updateMutation.mutate(result.data);
      return;
    }
    createMutation.mutate(result.data);
  }

  const patient = patientQuery.data ?? null;
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <PageLayout
      title="Patient Information"
      contentClassName="flex flex-col gap-4"
    >

      {patientQuery.isLoading ? (
        <div className="text-muted-foreground text-sm">
          Loading patient information...
        </div>
      ) : patientQuery.isError ? (
        <div className="text-destructive text-sm">
          Failed to load patient information.
        </div>
      ) : (
        <form
          key={patient ? "existing" : "new"}
          className="flex max-w-md flex-col gap-4"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col gap-2">
            <label
              htmlFor="patient-surname"
              className="text-muted-foreground text-xs font-medium"
            >
              Surname
            </label>
            <Input
              id="patient-surname"
              name="surname"
              placeholder="Peter"
              defaultValue={patient?.surname ?? ""}
              disabled={!isAdmin}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="patient-lastname"
              className="text-muted-foreground text-xs font-medium"
            >
              Lastname
            </label>
            <Input
              id="patient-lastname"
              name="lastname"
              placeholder="Pan"
              defaultValue={patient?.lastname ?? ""}
              disabled={!isAdmin}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="patient-birthday"
              className="text-muted-foreground text-xs font-medium"
            >
              Birthday
            </label>
            <Input
              id="patient-birthday"
              name="birthday"
              type="date"
              defaultValue={patient?.birthday ?? ""}
              disabled={!isAdmin}
            />
          </div>

          <div className="flex justify-end">
            <Button size="sm" type="submit" disabled={!isAdmin || isPending}>
              {patient ? "Save patient" : "Add patient"}
            </Button>
          </div>
        </form>
      )}
    </PageLayout>
  );
}
