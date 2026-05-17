const statePlaceholders = [
  { label: "Fall detection", value: "No fall detected" },
  { label: "Indoor state", value: "Living room" },
  { label: "Outdoor state", value: "Inside safe zone" },
  { label: "Infrastructure", value: "Closed" },
];

export function StateOverviewPlaceholder() {
  return (
    <div className="grid overflow-hidden rounded-lg border bg-card sm:grid-cols-2 xl:grid-cols-4">
      {statePlaceholders.map((state) => (
        <div
          key={state.label}
          className="border-border/70 border-b px-4 py-3 sm:odd:border-r sm:[&:nth-last-child(-n+2)]:border-b-0 xl:border-b-0 xl:border-r xl:last:border-r-0"
        >
          <div className="text-muted-foreground text-xs font-medium uppercase">
            {state.label}
          </div>
          <div className="mt-1 text-sm font-medium">{state.value}</div>
        </div>
      ))}
    </div>
  );
}
