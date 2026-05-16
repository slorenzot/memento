'use client';

import { useCallback, useEffect, useState } from 'react';
import { Cloud, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { useT } from '@/i18n/translation-context';
import { useLocalePrefix } from '@/i18n/use-locale-prefix';
import { useRouter } from 'next/navigation';

const SYNC_TOKEN_KEY = 'memento-sync-token';
const HUB_URL = 'https://memento-hub.vercel.app';

type SyncState = 'idle' | 'syncing' | 'success' | 'error';

interface StoredToken {
  accessToken: string;
  tokenType: string;
  storedAt: number;
  serverUrl?: string;
}

/**
 * Sync button for the Header navbar.
 *
 * - No sync token → "Sync with Cloud" → navigates to login page (OAuth Device Flow)
 * - Has sync token → "Sincronizar" → triggers bidirectional sync with memento-hub
 */
export function SyncButton() {
  const t = useT();
  const prefix = useLocalePrefix();
  const router = useRouter();
  const [hasToken, setHasToken] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem(SYNC_TOKEN_KEY);
    setHasToken(!!token);

    function onStorage(e: StorageEvent) {
      if (e.key === SYNC_TOKEN_KEY) {
        setHasToken(!!e.newValue);
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Re-check on focus (same-tab updates don't fire StorageEvent)
  useEffect(() => {
    function onFocus() {
      const token = localStorage.getItem(SYNC_TOKEN_KEY);
      setHasToken(!!token);
    }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Auto-clear success/error after 4 seconds
  useEffect(() => {
    if (syncState === 'success' || syncState === 'error') {
      const timer = setTimeout(() => {
        setSyncState('idle');
        setSyncMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [syncState]);

  const handleSync = useCallback(async () => {
    const raw = localStorage.getItem(SYNC_TOKEN_KEY);
    if (!raw) return;

    let parsed: StoredToken;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    if (!parsed.accessToken) return;

    setSyncState('syncing');
    setSyncMessage(null);

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: parsed.accessToken,
          serverUrl: parsed.serverUrl || HUB_URL,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.message || `Sync failed (${res.status})`);
      }

      const result = await res.json();

      // Show errors even on 200 OK (partial failure)
      if (result.errors && result.errors.length > 0 && result.pulled === 0 && result.pushed === 0) {
        setSyncState('error');
        setSyncMessage(result.errors[0]);
      } else {
        setSyncState('success');
        const parts: string[] = [];
        if (result.pulled > 0) parts.push(`${result.pulled} ↓`);
        if (result.pushed > 0) parts.push(`${result.pushed} ↑`);
        setSyncMessage(parts.length > 0 ? parts.join(' · ') : t.sync.syncResult
          .replace('{pulled}', '0')
          .replace('{pushed}', '0'));
      }
    } catch (err) {
      setSyncState('error');
      setSyncMessage(
        err instanceof Error ? err.message : t.sync.syncError
      );
    }
  }, [t]);

  if (!mounted) {
    return (
      <div className="h-8 w-8 animate-pulse rounded-lg bg-[var(--color-neutral-bg)]" />
    );
  }

  // No token → show connect button
  if (!hasToken) {
    return (
      <button
        onClick={() => router.push(`${prefix}/sync`)}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-[var(--color-text-primary)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-hover)] transition-colors"
      >
        <Cloud className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t.sync.connectCloud}</span>
      </button>
    );
  }

  // Has token → show sync button + hub link
  const isSyncing = syncState === 'syncing';

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
          syncState === 'success'
            ? 'text-green-500 border border-green-500/30 bg-green-500/5'
            : syncState === 'error'
              ? 'text-red-400 border border-red-400/30 bg-red-400/5'
              : 'text-[var(--color-primary)] border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 hover:bg-[var(--color-primary)]/10'
        }`}
        title={syncMessage || undefined}
      >
        {isSyncing ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : syncState === 'success' ? (
          <RefreshCw className="w-3.5 h-3.5" />
        ) : (
          <RefreshCw className="w-3.5 h-3.5" />
        )}
        <span className="hidden sm:inline">
          {isSyncing
            ? t.sync.syncing
            : syncState === 'success'
              ? t.sync.syncSuccess
              : syncState === 'error'
                ? t.sync.syncError
                : t.sync.syncNow}
        </span>
      </button>

      {/* Hub link as secondary action */}
      <a
        href={HUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center rounded-lg p-1.5 text-[var(--color-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
        title="memento-hub.com"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
