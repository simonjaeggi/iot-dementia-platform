import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Patient, PatientDraft } from "./settings.config";

type PatientInformationSettingsProps = {
  isAdmin: boolean;
  patient: Patient | null;
  draft: PatientDraft;
  isLoading: boolean;
  isError: boolean;
  isPending: boolean;
  onDraftChange: (field: keyof PatientDraft, value: string) => void;
  onSave: () => void;
};

export function PatientInformationSettings({
  isAdmin,
  patient,
  draft,
  isLoading,
  isError,
  isPending,
  onDraftChange,
  onSave,
}: PatientInformationSettingsProps) {
  const emptyStateColumnClass = "md:col-span-2 xl:col-span-3";
  const hasPatient = patient !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient Information</CardTitle>
        <CardDescription>
          Manage the single patient profile used by the system.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            <div className={`text-sm text-muted-foreground ${emptyStateColumnClass}`}>
              Loading patient information...
            </div>
          ) : null}

          {isError ? (
            <div className={`text-sm text-destructive ${emptyStateColumnClass}`}>
              Failed to load patient information.
            </div>
          ) : null}

          {!isLoading && !isError ? (
            <form
              className="bg-background flex h-full flex-col gap-4 rounded-lg border p-4 shadow-xs"
              onSubmit={(event) => {
                event.preventDefault();
                onSave();
              }}
            >
              <div className="space-y-1">
                <div className="text-base font-medium">
                  {hasPatient ? "Patient information" : "Add patient"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isAdmin
                    ? hasPatient
                      ? "Update the current patient profile."
                      : "Create the single patient profile used by the system."
                    : "Only admins can change the patient."}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Surname
                </div>
                <Input
                  placeholder="Peter"
                  value={draft.surname}
                  disabled={!isAdmin}
                  onChange={(event) => onDraftChange("surname", event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Lastname
                </div>
                <Input
                  placeholder="Pan"
                  value={draft.lastname}
                  disabled={!isAdmin}
                  onChange={(event) => onDraftChange("lastname", event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Birthday
                </div>
                <Input
                  type="date"
                  value={draft.birthday}
                  disabled={!isAdmin}
                  onChange={(event) => onDraftChange("birthday", event.target.value)}
                />
              </div>

              <div className="mt-auto flex items-center justify-between gap-3">
                {!isAdmin ? (
                  <div className="text-xs text-muted-foreground">
                    Only admins can change the patient.
                  </div>
                ) : (
                  <div />
                )}
                <Button size="sm" type="submit" disabled={!isAdmin || isPending}>
                  {hasPatient ? "Save patient" : "Add patient"}
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
