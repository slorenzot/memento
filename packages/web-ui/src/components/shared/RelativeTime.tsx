'use client';

import { formatDistanceToNow, Locale } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { es } from 'date-fns/locale/es';
import { useParams } from 'next/navigation';

interface RelativeTimeProps {
  date: Date | string | number | null | undefined;
}

const dateFnsLocales: Record<string, Locale> = {
  en: enUS,
  es: es,
};

export function RelativeTime({ date }: RelativeTimeProps) {
  const params = useParams<{ lang?: string }>();
  const locale = params.lang ?? 'en';

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
