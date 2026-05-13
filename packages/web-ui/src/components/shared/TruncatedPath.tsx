'use client';

interface TruncatedPathProps {
  path: string;
  className?: string;
}

export function TruncatedPath({ path, className = '' }: TruncatedPathProps) {
  return (
    <span className={`group/path relative inline-block max-w-full ${className}`}>
      <span className="block truncate font-mono text-inherit">
        {path}
      </span>
      <span
        className="
          pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2
          whitespace-nowrap rounded-md px-2.5 py-1.5
          bg-[var(--color-text-primary)] text-[var(--color-on-primary)]
          text-[12px] font-mono leading-normal
          opacity-0 transition-opacity duration-150
          group-hover/path:opacity-100
        "
      >
        {path}
      </span>
    </span>
  );
}
