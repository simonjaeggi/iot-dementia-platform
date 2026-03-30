import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenuCheckboxItem,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { IconCheck, IconEdit } from "@tabler/icons-react";
import { ChevronDown } from "lucide-react";
import { axiosInstance, getAxiosErrorMessage } from "@/lib/api";
import { toast } from "sonner";

type DeviceColumnId = "name" | "fingerprint" | "downtime" | "status";

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

export function DeviceTable({
  selectedFingerprint,
  onSelectDevice,
}: {
  selectedFingerprint?: string | null;
  onSelectDevice?: (fingerprint: string) => void;
}) {
  const queryClient = useQueryClient();
  const [filterValue, setFilterValue] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<
    Record<DeviceColumnId, boolean>
  >({
    name: true,
    fingerprint: false,
    downtime: true,
    status: true,
  });
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
  const filteredDevices = devices.filter((device) => {
    const query = filterValue.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return [
      device.name,
      device.fingerprint,
      device.downtime,
      device.status,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

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

  function toggleColumn(column: DeviceColumnId, visible: boolean) {
    setColumnVisibility((current) => ({
      ...current,
      [column]: visible,
    }));
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

  const visibleColumnCount = Math.max(
    Object.values(columnVisibility).filter(Boolean).length,
    1,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          placeholder="Filter devices..."
          value={filterValue}
          onChange={(event) => setFilterValue(event.target.value)}
          className="w-full md:max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full md:w-auto">
              Columns
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={columnVisibility.name}
              onCheckedChange={(value) => toggleColumn("name", Boolean(value))}
            >
              Name
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.fingerprint}
              onCheckedChange={(value) =>
                toggleColumn("fingerprint", Boolean(value))
              }
            >
              Fingerprint
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.downtime}
              onCheckedChange={(value) => toggleColumn("downtime", Boolean(value))}
            >
              Downtime
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.status}
              onCheckedChange={(value) => toggleColumn("status", Boolean(value))}
            >
              Status
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {columnVisibility.name ? <TableHead>Name</TableHead> : null}
              {columnVisibility.fingerprint ? (
                <TableHead>Fingerprint</TableHead>
              ) : null}
              {columnVisibility.downtime ? <TableHead>Downtime</TableHead> : null}
              {columnVisibility.status ? <TableHead>Status</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
          {devicesQuery.isLoading ? (
            <TableRow>
              <TableCell colSpan={visibleColumnCount}>
                Loading devices...
              </TableCell>
            </TableRow>
          ) : devicesQuery.isError ? (
            <TableRow>
              <TableCell colSpan={visibleColumnCount}>
                Failed to load devices.
              </TableCell>
            </TableRow>
          ) : filteredDevices.length === 0 ? (
            <TableRow>
              <TableCell colSpan={visibleColumnCount}>
                No devices found.
              </TableCell>
            </TableRow>
          ) : (
            filteredDevices.map((device) => (
              <TableRow
                key={device.fingerprint}
                className={`group ${onSelectDevice ? "cursor-pointer" : ""}`}
                data-state={
                  device.fingerprint === selectedFingerprint ? "selected" : undefined
                }
                onClick={(event) => handleRowClick(event, device.fingerprint)}
              >
                {columnVisibility.name ? (
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
                ) : null}
                {columnVisibility.fingerprint ? (
                  <TableCell
                    className="max-w-[180px] truncate"
                    title={device.fingerprint}
                  >
                    {device.fingerprint}
                  </TableCell>
                ) : null}
                {columnVisibility.downtime ? (
                  <TableCell>{device.downtime}</TableCell>
                ) : null}
                {columnVisibility.status ? (
                  <TableCell>
                    {device.status === "online" && (
                      <Badge className="bg-green-600 text-white">Online</Badge>
                    )}
                    {device.status === "offline" && (
                      <Badge variant="destructive">Offline</Badge>
                    )}
                  </TableCell>
                ) : null}
              </TableRow>
            ))
          )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
