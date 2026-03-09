import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ApiEvent = {
  id: number;
  type: string;
  time: string;
};

export function EventTable() {
  const eventsQuery = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const response = await axiosInstance.get<{ events: ApiEvent[] }>(
        "/api/event",
      );
      return response.data.events;
    },
  });

  const events = eventsQuery.data ?? [];

  function formatTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {eventsQuery.isLoading ? (
            <TableRow>
              <TableCell colSpan={3}>Loading events...</TableCell>
            </TableRow>
          ) : eventsQuery.isError ? (
            <TableRow>
              <TableCell colSpan={3}>Failed to load events.</TableCell>
            </TableRow>
          ) : events.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3}>No events found.</TableCell>
            </TableRow>
          ) : (
            events.map((event) => (
              <TableRow key={event.id}>
                <TableCell>{event.id}</TableCell>
                <TableCell>{event.type}</TableCell>
                <TableCell>{formatTime(event.time)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
