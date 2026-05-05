import { Badge } from "@/components/ui/badge";
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
import { EVENT_TYPES, getAxiosErrorMessage, type ApiEvent } from "@/lib/api";
import { formatDateTime, labelToTitleCase } from "@/lib/detail-formatters";
export function EventTable({
  events,
  isLoading,
  error,
  selectedType,
  onSelectedTypeChange,
  selectedEventId,
  onSelectEvent,
}: {
  events: ApiEvent[];
  isLoading: boolean;
  error: unknown;
  selectedType?: string;
  onSelectedTypeChange: (type: string | null) => void;
  selectedEventId?: number | null;
  onSelectEvent?: (eventId: number) => void;
}) {
  const errorMessage = getAxiosErrorMessage(
    error,
    "Failed to load events.",
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Select
          value={selectedType ?? "all"}
          onValueChange={(value) =>
            onSelectedTypeChange(
              value ===  "all" ? null : value,
            )
          }
        >
          <SelectTrigger className="w-full md:max-w-sm" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={"all"}>All event types</SelectItem>
            {EVENT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {labelToTitleCase(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell>Loading events...</TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell>{errorMessage}</TableCell>
              </TableRow>
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell>
                  No events found.
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
                <TableRow
                  key={event.id}
                  data-state={
                    event.id === selectedEventId ? "selected" : undefined
                  }
                  className={onSelectEvent ? "cursor-pointer" : undefined}
                  onClick={() => onSelectEvent?.(event.id)}
                >
                  <TableCell className="min-w-40 font-medium">
                    {formatDateTime(event.time, event.time)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="whitespace-nowrap">
                      {labelToTitleCase(event.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="min-w-32 font-medium">
                      { event.data.source.kind ? labelToTitleCase(event.data.source.kind): "Unknown"}
                    </div>
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
