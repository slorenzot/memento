'use client';

import { useEffect, useState } from 'react';
import { Cloud, ExternalLink } from 'lucide-react';
import { useT } from '@/i18n/translation-context';
import { useLocalePrefix } from '@/i18n/use-locale-prefix';
import { useRouter } from 'next/navigation';

const SYNC_TOKEN_KEY = 'memento-sync-token';
const HUB_URL = 'https://memento-hub.vercel.app';

/**
 * Sync button for the Header navbar.
 *
 * - No sync token → "Sync with Cloud" → navigates to login page (OAuth Device Flow)
 * - Has sync token → "Open memento-hub.com" → opens external link
 */
export function SyncButton() {
  const t = useT();
  const prefix = useLocalePrefix();
  const router = useRouter();
  const [hasToken, setHasToken] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem(SYNC_TOKEN_KEY);
    setHasToken(!!token);

    // Listen for storage changes (e.g. from login page setting the token)
    function onStorage(e: StorageEvent) {
      if (e.key === SYNC_TOKEN_KEY) {
        setHasToken(!!e.newValue);
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Also poll localStorage on focus (same-tab updates don't fire StorageEvent)
  useEffect(() => {
    function onFocus() {
      const token = localStorage.getItem(SYNC_TOKEN_KEY);
      setHasToken(!!token);
    }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  if (!mounted) {
    return (
      <div className="h-8 w-8 animate-pulse rounded-lg bg-[var(--color-neutral-bg)]" />
    );
  }

  if (hasToken) {
    return (
      <a
        href={HUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-[var(--color-primary)] border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 hover:bg-[var(--color-primary)]/10 transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t.sync.openHub}</span>
      </a>
    );
  }

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
