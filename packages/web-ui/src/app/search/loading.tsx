export default function SearchLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-6 w-24 rounded bg-[var(--color-surface-hover)]" />
      <div className="flex gap-3">
        <div className="h-10 flex-1 rounded-lg bg-[var(--color-surface-hover)]" />
        <div className="h-10 w-24 rounded-full bg-[var(--color-surface-hover)]" />
      </div>
    </div>
  );
}
