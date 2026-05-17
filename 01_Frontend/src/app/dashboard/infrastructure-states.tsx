import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import {
  axiosInstance,
  endpoints,
  getAxiosErrorMessage,
  InfrastructureStatesResponseSchema,
  type InfrastructureState,
} from "@/lib/api";
import { formatDateTime } from "@/lib/detail-formatters";

export function InfrastructureStates() {
  const statesQuery = useQuery({
    queryKey: ["infrastructure-states"],
    queryFn: async () => {
      const response = await axiosInstance.get(endpoints.misc.infrastructureStates);
      return InfrastructureStatesResponseSchema.parse(response.data).states;
    },
  });

  const states = statesQuery.data ?? [];

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-border/70 border-b px-4 py-3">
        <div className="text-muted-foreground text-xs font-medium uppercase">
          Infrastructure states
        </div>
        <div className="mt-1 text-sm font-medium">
          {statesQuery.isLoading
            ? "Loading"
            : statesQuery.isError
              ? getAxiosErrorMessage(
                  statesQuery.error,
                  "Failed to load infrastructure states.",
                )
              : states.length === 0
                ? "No infrastructure states"
                : null}
        </div>
      </div>
      {states.length > 0 ? (
        <div className="divide-border/70 divide-y">
          {states.map((state) => (
            <InfrastructureStateRow key={state.fingerprint} state={state} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function InfrastructureStateRow({ state }: { state: InfrastructureState }) {
  return (
    <div className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
      <div className="min-w-0">
        <Link
          to={`/devices?fingerprint=${state.fingerprint}`}
          className="block truncate text-sm font-medium underline-offset-4 hover:underline"
        >
          {state.deviceName ?? "Unnamed device"}
        </Link>
      </div>
      <div className="text-sm font-medium capitalize">{state.status}</div>
      <div className="text-muted-foreground text-xs sm:text-right">
        <div>Since {formatDateTime(state.statusSince.toISOString())}</div>
        <div>Observed {formatDateTime(state.lastObserved.toISOString())}</div>
      </div>
    </div>
  );
}
