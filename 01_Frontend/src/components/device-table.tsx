import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { IconCheck, IconDotsVertical, IconEdit } from "@tabler/icons-react"
import { axiosInstance } from "@/lib/api"

type Device = {
  name?: string
  fingerprint: string
  uptime: string
  status: "online" | "offline" | "degraded"
}

type ApiDevice = {
  certFingerprintSha256: string
  createdAt: string
  lastSeen: string | null
}

const DEFAULT_DEVICE_NAME = "Unnamed device"

export function DeviceTable() {
  const [nameOverrides, setNameOverrides] = useState<Record<string, string>>({})
  const [editingFingerprint, setEditingFingerprint] = useState<string | null>(
    null
  )
  const [draftName, setDraftName] = useState("")

  const devicesQuery = useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      const response = await axiosInstance.get<{ devices: ApiDevice[] }>(
        "/api/device/web"
      )
      return response.data.devices
    },
  })

  const devices = useMemo<Device[]>(
    () =>
      (devicesQuery.data ?? []).map((device) => ({
        name: nameOverrides[device.certFingerprintSha256] ?? "",
        fingerprint: device.certFingerprintSha256,
        uptime: "-",
        status: "degraded",
      })),
    [devicesQuery.data, nameOverrides]
  )

  function getDisplayName(name?: string) {
    return name?.trim() ? name : DEFAULT_DEVICE_NAME
  }

  function startNameEdit(device: Device) {
    setEditingFingerprint(device.fingerprint)
    setDraftName(getDisplayName(device.name))
  }

  function saveName(fingerprint: string) {
    setNameOverrides((currentNames) => ({
      ...currentNames,
      [fingerprint]: draftName.trim(),
    }))
    setEditingFingerprint(null)
  }

  function cancelNameEdit() {
    setEditingFingerprint(null)
    setDraftName("")
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Fingerprint</TableHead>
            <TableHead>Up/Downtime</TableHead>
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
                          saveName(device.fingerprint)
                        }
                        if (event.key === "Escape") {
                          cancelNameEdit()
                        }
                      }}
                      className="h-8 w-52"
                      aria-label={`Device name for ${device.fingerprint}`}
                    />
                  ) : (
                    <span>{getDisplayName(device.name)}</span>
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
              <TableCell>{device.fingerprint}</TableCell>
              <TableCell>{device.uptime}</TableCell>
              <TableCell>
                {device.status === "online" && (
                  <Badge className="bg-green-600 text-white">Online</Badge>
                )}
                {device.status === "degraded" && (
                  <Badge className="bg-amber-500 text-white">Degraded</Badge>
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
                    <DropdownMenuItem variant="destructive">Forget</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
