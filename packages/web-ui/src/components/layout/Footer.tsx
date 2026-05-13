'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/i18n/translation-context';
import { TruncatedPath } from '@/components/shared/TruncatedPath';

interface HealthData {
  status: 'healthy' | 'unhealthy';
  database: string;
}

export function Footer() {
  const t = useT();
  const [health, setHealth] = useState<HealthData | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch(() => setHealth(null));
  }, []);

  const isHealthy = health?.status === 'healthy';

  return (
    <footer className="flex items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-1.5">
      {/* Left: Database path */}
      <div className="flex items-center gap-1.5 min-w-0 max-w-[60%]">
        <span className="text-[11px] text-[var(--color-tertiary)] whitespace-nowrap sm:inline hidden">
          {t.footer.database}
        </span>
        {health?.database ? (
          <TruncatedPath path={health.database} className="text-[11px] text-[var(--color-tertiary)]" />
        ) : (
          <span className="text-[11px] text-[var(--color-tertiary)]">—</span>
        )}
      </div>

      {/* Right: Health status */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${
            isHealthy ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span className="text-[11px] text-[var(--color-tertiary)]">
          {health ? (isHealthy ? t.footer.healthy : t.footer.unhealthy) : '—'}
        </span>
      </div>
    </footer>
  );
}
