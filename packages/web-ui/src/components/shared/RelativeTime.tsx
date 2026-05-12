'use client';

import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import { useUIStore } from '@/stores/ui-store';

interface RelativeTimeProps {
  date: Date | string | number | null | undefined;
}

const dateFnsLocales = {
  en: enUS,
  es: es,
};

export function RelativeTime({ date }: RelativeTimeProps) {
  const locale = useUIStore((s) => s.locale);

  // Coerce to Date — handle string, number, null, undefined, Date
  let d: Date;
  if (date instanceof Date) {
    d = date;
  } else if (typeof date === 'number') {
    d = new Date(date);
  } else if (typeof date === 'string') {
    d = new Date(date);
  } else {
    return <span className="text-[13px] text-[var(--color-tertiary)]">--</span>;
  }

  // Guard against null, undefined, or invalid dates
  const ts = d.getTime();
  if (isNaN(ts)) {
    return <span className="text-[13px] text-[var(--color-tertiary)]">--</span>;
  }

  const dateFnsLocale = dateFnsLocales[locale] ?? dateFnsLocales.en;
  const label = formatDistanceToNow(d, { addSuffix: true, locale: dateFnsLocale });

  return (
    <time dateTime={d.toISOString()} className="text-[13px] text-[var(--color-tertiary)]">
      {label}
    </time>
  );
}
