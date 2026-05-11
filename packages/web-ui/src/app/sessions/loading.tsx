export default function SessionsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-6 w-24 rounded bg-[var(--color-surface-hover)]" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-[var(--color-border)] p-4">
          <div className="h-4 w-1/3 rounded bg-[var(--color-surface-hover)]" />
          <div className="mt-2 h-3 w-1/4 rounded bg-[var(--color-surface-hover)]" />
        </div>
      ))}
    </div>
  );
}
