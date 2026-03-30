import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  type Column,
  type ColumnDef,
  type PaginationState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { axiosInstance, getAxiosErrorMessage } from "@/lib/api";
import { formatDateTime, formatEventType } from "@/lib/detail-formatters";

type DeviceEventSource = {
  kind: "device";
  deviceFingerprint: string;
  bootId: number;
  uptimeMs: number;
};

type BackendEventSource = {
  kind: "backend";
  service: string;
};

type UserEventSource = {
  kind: "user";
  userId: string;
  userEmail: string;
};

type ApiEventSource = DeviceEventSource | BackendEventSource | UserEventSource;

type ApiEvent = {
  id: number;
  type: string;
  time: string;
  source: ApiEventSource;
  data?: unknown;
};

const columnLabels: Record<string, string> = {
  id: "ID",
  type: "Type",
  time: "Time",
  source: "Source",
  data: "Data",
};

function shortenValue(value: string, maxLength = 14) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function stringifyEventPart(value: unknown) {
  if (value == null) {
    return "";
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getEventSourceLabel(source: ApiEventSource) {
  switch (source.kind) {
    case "device":
      return "Device";
    case "backend":
      return "Backend";
    case "user":
      return "User";
  }
}

function getEventSourceDetails(source: ApiEventSource) {
  switch (source.kind) {
    case "device":
      return `${shortenValue(source.deviceFingerprint)} | boot ${source.bootId}`;
    case "backend":
      return source.service;
    case "user":
      return source.userEmail;
  }
}

function getEventDataSummary(event: ApiEvent) {
  if (event.data == null) {
    return "No payload";
  }

  const summary = stringifyEventPart(event.data);
  return summary.length > 120 ? `${summary.slice(0, 117)}...` : summary;
}

function buildEventSearchIndex(event: ApiEvent) {
  return [
    event.id,
    event.type,
    formatEventType(event.type),
    event.time,
    getEventSourceLabel(event.source),
    getEventSourceDetails(event.source),
    stringifyEventPart(event.source),
    stringifyEventPart(event.data),
  ]
    .join(" ")
    .toLowerCase();
}

function SortableHeader({
  column,
  title,
}: {
  column: Column<ApiEvent, unknown>;
  title: string;
}) {
  const sortDirection = column.getIsSorted();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => column.toggleSorting(sortDirection === "asc")}
    >
      {title}
      {sortDirection === "asc" ? (
        <ArrowUp className="size-4" />
      ) : sortDirection === "desc" ? (
        <ArrowDown className="size-4" />
      ) : (
        <ArrowUpDown className="size-4" />
      )}
    </Button>
  );
}

function getColumns(): ColumnDef<ApiEvent>[] {
  return [
    {
      accessorKey: "id",
      header: ({ column }) => <SortableHeader column={column} title="ID" />,
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">{row.original.id}</span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline" className="whitespace-nowrap">
          {formatEventType(row.original.type)}
        </Badge>
      ),
    },
    {
      accessorKey: "time",
      header: ({ column }) => <SortableHeader column={column} title="Time" />,
      sortingFn: (rowA, rowB) =>
        new Date(rowA.original.time).getTime() -
        new Date(rowB.original.time).getTime(),
      cell: ({ row }) => (
        <div className="min-w-40 font-medium">
          {formatDateTime(row.original.time, row.original.time)}
        </div>
      ),
    },
    {
      id: "source",
      accessorFn: (row) => getEventSourceLabel(row.source),
      header: "Source",
      cell: ({ row }) => (
        <div className="min-w-32">
          <div className="font-medium">
            {getEventSourceLabel(row.original.source)}
          </div>
          <div className="text-muted-foreground text-xs">
            {getEventSourceDetails(row.original.source)}
          </div>
        </div>
      ),
    },
    {
      id: "data",
      accessorFn: (row) => getEventDataSummary(row),
      header: "Data",
      cell: ({ row }) => {
        const summary = getEventDataSummary(row.original);

        return (
          <div
            className="text-muted-foreground max-w-[28rem] truncate font-mono text-xs"
            title={stringifyEventPart(row.original.data) || "No payload"}
          >
            {summary}
          </div>
        );
      },
    },
    {
      id: "search",
      accessorFn: buildEventSearchIndex,
      header: () => null,
      cell: () => null,
      enableHiding: false,
    },
  ];
}

export function EventTable({
  selectedEventId,
  onSelectEvent,
}: {
  selectedEventId?: number | null;
  onSelectEvent?: (eventId: number) => void;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "id", desc: true },
  ]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      source: false,
      data: false,
      search: false,
    });
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 15,
  });

  const eventsQuery = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const response = await axiosInstance.get<{ events: ApiEvent[] }>(
        "/api/event",
      );
      return response.data.events;
    },
  });

  const columns = getColumns();

  const table = useReactTable({
    data: eventsQuery.data ?? [],
    columns,
    getRowId: (row) => row.id.toString(),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnVisibility,
      pagination,
    },
    initialState: {
      columnFilters: [
        {
          id: "search",
          value: "",
        },
      ],
    },
  });

  const searchValue =
    (table.getColumn("search")?.getFilterValue() as string) ?? "";
  const visibleColumnCount = Math.max(table.getVisibleLeafColumns().length, 1);
  const totalRows = eventsQuery.data?.length ?? 0;
  const errorMessage = getAxiosErrorMessage(
    eventsQuery.error,
    "Failed to load events.",
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          placeholder="Filter events..."
          value={searchValue}
          onChange={(event) =>
            table.getColumn("search")?.setFilterValue(event.target.value)
          }
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
            {table
              .getAllColumns()
              .filter((column) => column.id !== "search" && column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) =>
                    column.toggleVisibility(Boolean(value))
                  }
                >
                  {columnLabels[column.id] ?? formatEventType(column.id)}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {eventsQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={visibleColumnCount}>
                  Loading events...
                </TableCell>
              </TableRow>
            ) : eventsQuery.isError ? (
              <TableRow>
                <TableCell colSpan={visibleColumnCount}>
                  {errorMessage}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumnCount}>
                  No events found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={
                    row.original.id === selectedEventId ? "selected" : undefined
                  }
                  className={onSelectEvent ? "cursor-pointer" : undefined}
                  onClick={() => onSelectEvent?.(row.original.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-muted-foreground text-sm">
          Showing {table.getRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} filtered rows ({totalRows}{" "}
          total)
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Rows per page</span>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger size="sm" className="w-[88px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {[15, 30, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={String(pageSize)}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {Math.max(table.getPageCount(), 1)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
