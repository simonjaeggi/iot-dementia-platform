import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type AccessCode } from "@/lib/api";
import { formatDateTime } from "@/lib/detail-formatters";
import { Button } from "@/components/ui/button";

type AccessCodeStatus =
  | "Active"
  | "Redeemed"
  | "Revoked"
  | "Expired"
  | "Initial";

function getStatus(code: AccessCode, now: Date): AccessCodeStatus {
  if (code.isInitialAccessCode) return "Initial";
  if (code.redeemedAt) return "Redeemed";
  if (code.revokedAt) return "Revoked";
  if (code.expiresAt && code.expiresAt.getTime() < now.getTime())
    return "Expired";
  return "Active";
}

function getButtonVersion(
  status: AccessCodeStatus,
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "Active":
      return "secondary";
    case "Redeemed":
      return "outline";
    case "Revoked":
    case "Expired":
      return "destructive";
    case "Initial":
      return "default";
  }
}

export function AccessCodesTable({
  codes,
  isLoading,
  isError,
  errorMessage,
  onRevoke,
}: {
  codes: AccessCode[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  onRevoke: (id: number) => void;
}) {
  const now = new Date();

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Redeemed by</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell>Loading access codes...</TableCell>
            </TableRow>
          ) : isError ? (
            <TableRow>
              <TableCell>{errorMessage}</TableCell>
            </TableRow>
          ) : codes.length === 0 ? (
            <TableRow>
              <TableCell>No access codes have been issued yet.</TableCell>
            </TableRow>
          ) : (
            codes.map((code) => {
              const status = getStatus(code, now);
              return (
                <TableRow key={code.id}>
                  <TableCell className="font-medium tabular-nums">
                    {code.id}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getButtonVersion(status)}>{status}</Badge>
                  </TableCell>
                  <TableCell className="min-w-40">
                    {formatDateTime(code.createdAt.toISOString())}
                  </TableCell>
                  <TableCell className="min-w-40">
                    {code.expiresAt
                      ? formatDateTime(code.expiresAt.toISOString())
                      : "—"}
                  </TableCell>
                  <TableCell
                    className="text-muted-foreground max-w-[24rem] truncate"
                    title={code.redeemedByEmail ?? ""}
                  >
                    {code.redeemedByEmail ?? "—"}
                  </TableCell>
                  <TableCell>
                      <Button variant={"outline"} color={"red"} disabled={getStatus(code, new Date()) !== "Active"} size="sm" onClick={() => onRevoke(code.id)}>Revoke</Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
