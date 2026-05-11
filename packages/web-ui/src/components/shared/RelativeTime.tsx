'use client';

import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import { useUIStore } from '@/stores/ui-store';

interface RelativeTimeProps {
  date: Date | string;
}

const dateFnsLocales = {
  en: enUS,
  es: es,
};

export function RelativeTime({ date }: RelativeTimeProps) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const locale = useUIStore((s) => s.locale);
  const dateFnsLocale = dateFnsLocales[locale] ?? dateFnsLocales.en;
  const label = formatDistanceToNow(d, { addSuffix: true, locale: dateFnsLocale });

  return (
    <time dateTime={d.toISOString()} className="text-[13px] text-[var(--color-tertiary)]">
      {label}
    </time>
  );
}
