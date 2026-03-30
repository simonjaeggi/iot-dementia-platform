import { useState } from "react";
import axios from "axios";
import { IconCheck, IconCopy, IconEdit } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { axiosInstance, getAxiosErrorMessage } from "@/lib/api";
import { formatDateTime, formatJson } from "@/lib/detail-formatters";

type DeviceSensor = {
  id: string;
  type: string;
  pin?: number;
  address?: string;
  bus?: number;
};

type DeviceConfig = {
  version: number;
  publishIntervalMs: number;
  sensors: DeviceSensor[];
};

type ApiDevice = {
  name: string | null;
  certFingerprintSha256: string;
  createdAt: string;
  lastSeen: string | null;
  downSeconds: number | null;
  config: DeviceConfig;
};

function formatDowntime(seconds: number | null, timeoutSeconds: number) {
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

function formatPublishInterval(intervalMs: number) {
  if (intervalMs < 1000) {
    return `${intervalMs} ms`;
  }

  const seconds = intervalMs / 1000;

  if (seconds < 60) {
    return `${seconds} s`;
  }

  const minutes = seconds / 60;
  return Number.isInteger(minutes)
    ? `${minutes} min`
    : `${minutes.toFixed(1)} min`;
}

function formatSensorDetails(sensor: DeviceSensor) {
  const details = [];

  if (sensor.pin != null) {
    details.push(`Pin ${sensor.pin}`);
  }

  if (sensor.address) {
    details.push(`Address ${sensor.address}`);
  }

  if (sensor.bus != null) {
    details.push(`Bus ${sensor.bus}`);
  }

  return details.length > 0 ? details.join(" | ") : "No extra details";
}

function shortenFingerprint(value: string, length = 32) {
  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, length)}...`;
}

type DeviceDetailsPanelProps = {
  fingerprint: string | null;
  onDelete?: () => void;
};

export function DeviceDetailsPanel({
  fingerprint,
  onDelete,
}: DeviceDetailsPanelProps) {
  const queryClient = useQueryClient();
  const timeoutSeconds = Number(import.meta.env.VITE_DEVICE_TIMEOUT_SEC || 30);
  const isValidFingerprint = fingerprint
    ? /^[0-9a-f]{64}$/i.test(fingerprint)
    : false;
  const [draftName, setDraftName] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);

  const deviceQuery = useQuery({
    queryKey: ["device", fingerprint],
    enabled: isValidFingerprint,
    retry: false,
    queryFn: async () => {
      const response = await axiosInstance.get<ApiDevice>(
        `/api/device/web/${encodeURIComponent(fingerprint!)}`,
      );
      return response.data;
    },
  });

  const renameDeviceMutation = useMutation({
    mutationFn: async (name: string) => {
      await axiosInstance.put("/api/device/web/rename", {
        fingerprint,
        name: name.trim(),
      });
    },
    onSuccess: async () => {
      setDraftName(null);
      setIsEditingName(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["device", fingerprint] }),
        queryClient.invalidateQueries({ queryKey: ["devices"] }),
      ]);
      toast.success("Renamed device successfully");
    },
    onError: (error: unknown) => {
      toast.error(getAxiosErrorMessage(error, "Failed to rename device."));
    },
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: async () => {
      await axiosInstance.delete("/api/device/web/delete", {
        data: { fingerprint },
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["device", fingerprint] }),
        queryClient.invalidateQueries({ queryKey: ["devices"] }),
      ]);
      onDelete?.();
      toast.success("Device deleted successfully");
    },
    onError: (error: unknown) => {
      toast.error(getAxiosErrorMessage(error, "Failed to delete device."));
    },
  });

  const errorMessage = getAxiosErrorMessage(
    deviceQuery.error,
    "Failed to load device.",
  );
  const detailErrorMessage =
    axios.isAxiosError(deviceQuery.error) &&
    deviceQuery.error.response?.status === 404
      ? "Device not found."
      : errorMessage;
  const currentName = deviceQuery.data?.name ?? "";
  const displayedName = currentName || "Unnamed device";
  const currentDraftName = draftName ?? currentName;

  function startNameEdit() {
    setDraftName(currentName);
    setIsEditingName(true);
  }

  function cancelNameEdit() {
    setDraftName(null);
    setIsEditingName(false);
  }

  function saveName() {
    renameDeviceMutation.mutate(currentDraftName);
  }

  return (
    <Card className="gap-3 py-3">
      <CardContent className="px-3 py-0 text-sm">
        {!fingerprint ? (
          <div className="text-muted-foreground text-sm">
            Choose a device to inspect it without leaving the table.
          </div>
        ) : !isValidFingerprint ? (
          <div className="text-sm">Invalid device fingerprint.</div>
        ) : deviceQuery.isLoading ? (
          <div className="text-sm">Loading device...</div>
        ) : deviceQuery.isError ? (
          <div className="text-sm">{detailErrorMessage}</div>
        ) : deviceQuery.data ? (
          <div className="space-y-3">
            <div>
              <div className="group mb-2 flex items-center gap-2">
                {isEditingName ? (
                  <Input
                    value={currentDraftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        saveName();
                      }
                      if (event.key === "Escape") {
                        cancelNameEdit();
                      }
                    }}
                    className="h-8 w-52"
                    placeholder="Unnamed device"
                    disabled={renameDeviceMutation.isPending}
                    aria-label={`Device name for ${fingerprint}`}
                  />
                ) : (
                  <div className="text-sm font-medium">{displayedName}</div>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className={`h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/60 ${
                    isEditingName
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  }`}
                  onClick={() => (isEditingName ? saveName() : startNameEdit())}
                  disabled={
                    renameDeviceMutation.isPending ||
                    (isEditingName && currentDraftName.trim() === currentName)
                  }
                >
                  {isEditingName ? (
                    <IconCheck className="size-4" />
                  ) : (
                    <IconEdit className="size-4" />
                  )}
                  <span className="sr-only">
                    {isEditingName ? "Save device name" : "Edit device name"}
                  </span>
                </Button>
              </div>
              <div className="grid gap-3">
                <div>
                  <div className="text-muted-foreground text-xs">
                    Fingerprint
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <div
                      className="text-sm font-medium"
                      title={deviceQuery.data.certFingerprintSha256}
                    >
                      {shortenFingerprint(
                        deviceQuery.data.certFingerprintSha256,
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          deviceQuery.data!.certFingerprintSha256,
                        );
                        toast.success("Copied fingerprint");
                      }}
                    >
                      <IconCopy className="size-4" />
                      <span className="sr-only">Copy fingerprint</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <div className="mb-2 text-sm font-medium">Device Status</div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="text-muted-foreground text-xs">Status</div>
                  <div className="text-sm font-medium">
                    {deviceQuery.data.downSeconds != null &&
                    deviceQuery.data.downSeconds < timeoutSeconds
                      ? "Online"
                      : "Offline"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Downtime</div>
                  <div className="text-sm font-medium">
                    {formatDowntime(
                      deviceQuery.data.downSeconds,
                      timeoutSeconds,
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">
                    Publish interval
                  </div>
                  <div className="text-sm font-medium">
                    {formatPublishInterval(
                      deviceQuery.data.config.publishIntervalMs,
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">
                    Config version
                  </div>
                  <div className="text-sm font-medium">
                    {deviceQuery.data.config.version}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Created</div>
                  <div className="text-sm font-medium">
                    {formatDateTime(
                      deviceQuery.data.createdAt,
                      deviceQuery.data.createdAt,
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Last seen</div>
                  <div className="text-sm font-medium">
                    {formatDateTime(deviceQuery.data.lastSeen)}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <div className="mb-2 text-sm font-medium">Sensors</div>
              {deviceQuery.data.config.sensors.length === 0 ? (
                <div className="text-muted-foreground text-sm">
                  No sensors configured.
                </div>
              ) : (
                <div className="space-y-3">
                  {deviceQuery.data.config.sensors.map((sensor) => (
                    <div
                      key={sensor.id}
                      className="rounded-lg border px-3 py-2.5"
                    >
                      <div className="text-sm font-medium">{sensor.id}</div>
                      <div className="text-muted-foreground text-xs">
                        {sensor.type}
                      </div>
                      <div className="text-muted-foreground mt-1 text-sm">
                        {formatSensorDetails(sensor)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div>
              <div className="mb-2 text-sm font-medium">Actions</div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-destructive/30 text-destructive hover:border-destructive/50 hover:text-destructive"
                  >
                    Forget device
                  </Button>
                </AlertDialogTrigger>

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Forget this device?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes the device from the platform. If the device
                      is still active, it will reappear with a default name.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={deleteDeviceMutation.isPending}
                      onClick={() => deleteDeviceMutation.mutate()}
                    >
                      Forget
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <Separator />

            <details className="rounded-lg border">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
                Advanced: JSON
              </summary>
              <div className="border-t px-3 py-3">
                <pre className="bg-muted overflow-x-auto rounded-lg p-3 text-xs">
                  {formatJson(deviceQuery.data)}
                </pre>
              </div>
            </details>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
