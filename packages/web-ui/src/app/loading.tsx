export default function Loading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-text-primary)]" />
        <p className="text-[14px] text-[var(--color-tertiary)]">Loading...</p>
      </div>
    </div>
  );
}
