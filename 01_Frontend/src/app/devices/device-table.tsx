import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IconCheck, IconEdit } from "@tabler/icons-react";
import { axiosInstance, endpoints, getAxiosErrorMessage, type ApiDevice } from "@/lib/api";
import { toast } from "sonner";

function formatDowntime(seconds: number | null, timeoutSeconds: number): string {
  if (seconds === null || seconds < 0) return "unknown";
  if (seconds < timeoutSeconds) return "0s";
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;

  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

type TableDevice = {
  name?: string;
  fingerprint: string;
  downtime: string;
  status: "online" | "offline";
};



export function DeviceTable({
  selectedFingerprint,
  onSelectDevice,
}: {
  selectedFingerprint?: string | null;
  onSelectDevice?: (fingerprint: string) => void;
}) {
  const queryClient = useQueryClient();
  const [editingFingerprint, setEditingFingerprint] = useState<string | null>(
    null,
  );
  const [draftName, setDraftName] = useState<string>("");

  const devicesQuery = useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      const response = await axiosInstance.get<{ devices: ApiDevice[] }>(
        endpoints.device.list,
      );
      return response.data.devices;
    },
  });

  const renameDeviceMutation = useMutation({
    mutationFn: async (vars: { fingerprint: string; name: string }) => {
      await axiosInstance.put(endpoints.device.rename, vars);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast.success("Renamed device successfully");
    },
    onError: (error: unknown) => {
      const msg = getAxiosErrorMessage(error, "Failed to rename device.");
      toast.error(msg);
    },
  });

  const timeoutSeconds = import.meta.env.VITE_DEVICE_TIMEOUT_SEC || 30;
  const devices: TableDevice[] = (devicesQuery.data ?? []).map((device) => ({
    name: device.name || "Unnamed device",
    fingerprint: device.certFingerprintSha256,
    downtime: formatDowntime(device.downSeconds, timeoutSeconds),
    status:
      device.downSeconds != null && device.downSeconds < timeoutSeconds
        ? "online"
        : "offline",
  }));

  function startNameEdit(device: TableDevice) {
    setEditingFingerprint(device.fingerprint);
    setDraftName(device.name || "");
  }

  function saveName(fingerprint: string) {
    const name = draftName.trim();
    renameDeviceMutation.mutate({ fingerprint, name });

    setEditingFingerprint(null);
    setDraftName("");
  }

  function cancelNameEdit() {
    setEditingFingerprint(null);
    setDraftName("");
  }

  function handleRowClick(
    event: React.MouseEvent<HTMLTableRowElement>,
    fingerprint: string,
  ) {
    const target = event.target as HTMLElement;

    if (target.closest("[data-row-action='true']")) {
      return;
    }

    onSelectDevice?.(fingerprint);
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Downtime</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
          {devicesQuery.isLoading ? (
            <TableRow>
              <TableCell>
                Loading devices...
              </TableCell>
            </TableRow>
          ) : devicesQuery.isError ? (
            <TableRow>
              <TableCell>
                Failed to load devices.
              </TableCell>
            </TableRow>
          ) : devices.length === 0 ? (
            <TableRow>
              <TableCell>
                No devices found.
              </TableCell>
            </TableRow>
          ) : (
            devices.map((device) => (
              <TableRow
                key={device.fingerprint}
                className={`group ${onSelectDevice ? "cursor-pointer" : ""}`}
                data-state={
                  device.fingerprint === selectedFingerprint ? "selected" : undefined
                }
                onClick={(event) => handleRowClick(event, device.fingerprint)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    {editingFingerprint === device.fingerprint ? (
                      <Input
                        data-row-action="true"
                        value={draftName}
                        onChange={(event) => setDraftName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            saveName(device.fingerprint);
                          }
                          if (event.key === "Escape") {
                            cancelNameEdit();
                          }
                        }}
                        className="h-8 w-52"
                        aria-label={`Device name for ${device.fingerprint}`}
                      />
                    ) : (
                      <span>{device.name}</span>
                    )}
                    <Button
                      data-row-action="true"
                      size="icon"
                      variant="ghost"
                      className={`h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/60 ${
                        editingFingerprint === device.fingerprint
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                      }`}
                      onClick={() =>
                        editingFingerprint === device.fingerprint
                          ? saveName(device.fingerprint)
                          : startNameEdit(device)
                      }
                    >
                      {editingFingerprint === device.fingerprint ? (
                        <IconCheck className="size-4" />
                      ) : (
                        <IconEdit className="size-4" />
                      )}
                      <span className="sr-only">
                        {editingFingerprint === device.fingerprint
                          ? "Save device name"
                          : "Edit device name"}
                      </span>
                    </Button>
                  </div>
                </TableCell>
                <TableCell>{device.downtime}</TableCell>
                <TableCell>
                  {device.status === "online" && (
                    <Badge className="bg-green-600 text-white">Online</Badge>
                  )}
                  {device.status === "offline" && (
                    <Badge variant="destructive">Offline</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
