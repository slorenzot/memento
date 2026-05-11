export default function ObservationsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-6 w-32 rounded bg-[var(--color-surface-hover)]" />
        <div className="h-8 w-32 rounded-full bg-[var(--color-surface-hover)]" />
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-6 w-20 rounded-full bg-[var(--color-surface-hover)]" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-[var(--color-border)] p-4">
          <div className="h-4 w-2/3 rounded bg-[var(--color-surface-hover)]" />
          <div className="mt-2 h-3 w-1/3 rounded bg-[var(--color-surface-hover)]" />
        </div>
      ))}
    </div>
  );
}
