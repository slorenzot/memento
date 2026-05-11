'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <h2 className="text-[20px] font-medium text-[var(--color-text-primary)]">Something went wrong</h2>
        <p className="mt-2 text-[14px] text-[var(--color-secondary)]">
          {error.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-full bg-[var(--color-neutral-bg)] px-4 py-2 text-[14px] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-active)] transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
