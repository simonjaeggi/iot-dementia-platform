import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IconCheck, IconDotsVertical, IconEdit } from "@tabler/icons-react";
import { axiosInstance, getAxiosErrorMessage } from "@/lib/api";
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
  AlertDialogTrigger,
} from "./ui/alert-dialog";

type Device = {
  name?: string;
  fingerprint: string;
  downtime: string;
  status: "online" | "offline";
};

type ApiDevice = {
  name: string | null;
  certFingerprintSha256: string;
  createdAt: string;
  lastSeen: string | null;
  downSeconds: number | null;
};

export function DeviceTable() {
  const queryClient = useQueryClient();
  const [editingFingerprint, setEditingFingerprint] = useState<string | null>(
    null,
  );
  const [draftName, setDraftName] = useState<string>("");

  const devicesQuery = useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      const response = await axiosInstance.get<{ devices: ApiDevice[] }>(
        "/api/device/web",
      );
      return response.data.devices;
    },
  });

  const renameDeviceMutation = useMutation({
    mutationFn: async (vars: { fingerprint: string; name: string }) => {
      await axiosInstance.put("/api/device/web/rename", vars);
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

  const deleteDeviceMutation = useMutation({
    mutationFn: async (vars: { fingerprint: string }) => {
      await axiosInstance.delete("/api/device/web/delete", { data: vars });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast.success("Device deleted successfully");
    },
    onError: (error: unknown) => {
      const msg = getAxiosErrorMessage(error, "Failed to delete device.");
      toast.error(msg);
    },
  });

  const timeoutSeconds = import.meta.env.VITE_DEVICE_TIMEOUT_SEC || 30;
  const devices: Device[] = (devicesQuery.data ?? []).map((device) => ({
    name: device.name || "Unnamed device",
    fingerprint: device.certFingerprintSha256,
    downtime: formatDowntime(device.downSeconds),
    status:
      device.downSeconds != null && device.downSeconds < timeoutSeconds
        ? "online"
        : "offline",
  }));

  function formatDowntime(seconds: number | null): string {
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

  function startNameEdit(device: Device) {
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

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Fingerprint</TableHead>
            <TableHead>Downtime</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {devicesQuery.isLoading ? (
            <TableRow>
              <TableCell colSpan={5}>Loading devices...</TableCell>
            </TableRow>
          ) : devicesQuery.isError ? (
            <TableRow>
              <TableCell colSpan={5}>Failed to load devices.</TableCell>
            </TableRow>
          ) : devices.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>No devices found.</TableCell>
            </TableRow>
          ) : (
            devices.map((device) => (
              <TableRow key={device.fingerprint} className="group">
                <TableCell>
                  <div className="flex items-center gap-2">
                    {editingFingerprint === device.fingerprint ? (
                      <Input
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
                <TableCell
                  className="max-w-[180px] truncate"
                  title={device.fingerprint}
                >
                  {device.fingerprint}
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
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      >
                        <IconDotsVertical className="size-4" />
                        <span className="sr-only">Open actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Details</DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={(e) => e.preventDefault()}
                          >
                            Forget
                          </DropdownMenuItem>
                        </AlertDialogTrigger>

                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Forget this device?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This removes the device from the platform. If the
                              device is still active, it will reappear with a default name.
                            </AlertDialogDescription>
                          </AlertDialogHeader>

                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              disabled={deleteDeviceMutation.isPending}
                              onClick={() =>
                                deleteDeviceMutation.mutate({
                                  fingerprint: device.fingerprint,
                                })
                              }
                            >
                              Forget
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
