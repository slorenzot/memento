'use client';

import { useEffect, useState } from 'react';
import { Cloud, CloudOff } from 'lucide-react';
import { useT } from '@/i18n/translation-context';
import { TruncatedPath } from '@/components/shared/TruncatedPath';

const SYNC_TOKEN_KEY = 'memento-sync-token';

interface HealthData {
  status: 'healthy' | 'unhealthy';
  database: string;
}

export function Footer() {
  const t = useT();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Health check
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch(() => setHealth(null));
  }, []);

  // Cloud connection status
  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem(SYNC_TOKEN_KEY);
    setIsCloudConnected(!!token);

    function onStorage(e: StorageEvent) {
      if (e.key === SYNC_TOKEN_KEY) {
        setIsCloudConnected(!!e.newValue);
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Re-check on focus (same-tab updates don't fire StorageEvent)
  useEffect(() => {
    function onFocus() {
      const token = localStorage.getItem(SYNC_TOKEN_KEY);
      setIsCloudConnected(!!token);
    }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const isHealthy = health?.status === 'healthy';

  return (
    <footer className="flex items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-1.5">
      {/* Left: Database path */}
      <div className="flex items-center gap-1.5 min-w-0 max-w-[40%]">
        <span className="text-[11px] text-[var(--color-tertiary)] whitespace-nowrap sm:inline hidden">
          {t.footer.database}
        </span>
        {health?.database ? (
          <TruncatedPath path={health.database} className="text-[11px] text-[var(--color-tertiary)]" />
        ) : (
          <span className="text-[11px] text-[var(--color-tertiary)]">—</span>
        )}
      </div>

      {/* Center: Cloud connection status */}
      <div className="flex items-center gap-1.5 shrink-0">
        {mounted && (
          <>
            {isCloudConnected ? (
              <Cloud className="w-3 h-3 text-blue-400" />
            ) : (
              <CloudOff className="w-3 h-3 text-[var(--color-tertiary)]" />
            )}
            <span className={`text-[11px] ${isCloudConnected ? 'text-blue-400' : 'text-[var(--color-tertiary)]'}`}>
              {isCloudConnected ? t.footer.connected : t.footer.disconnected}
            </span>
          </>
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
