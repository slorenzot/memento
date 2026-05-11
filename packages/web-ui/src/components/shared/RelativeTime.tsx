import { formatDistanceToNow } from 'date-fns';

interface RelativeTimeProps {
  date: Date | string;
}

export function RelativeTime({ date }: RelativeTimeProps) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const label = formatDistanceToNow(d, { addSuffix: true });

  return (
    <time dateTime={d.toISOString()} className="text-[13px] text-[var(--color-tertiary)]">
      {label}
    </time>
  );
}
