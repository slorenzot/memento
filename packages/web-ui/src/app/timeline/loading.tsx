export default function TimelineLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-6 w-24 rounded bg-[var(--color-surface-hover)]" />
      {[1, 2].map((group) => (
        <div key={group} className="space-y-3">
          <div className="h-3 w-32 rounded bg-[var(--color-surface-hover)]" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-[var(--color-border)] p-4">
              <div className="h-4 w-2/3 rounded bg-[var(--color-surface-hover)]" />
              <div className="mt-2 h-3 w-1/3 rounded bg-[var(--color-surface-hover)]" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
