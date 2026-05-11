'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { useUIStore, resolveTheme } from '@/stores/ui-store';
import { TranslationProvider } from '@/i18n/translation-context';
import type { Dictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n/config';
import { LOCALE_COOKIE } from '@/i18n/config';
import en from '@/i18n/locales/en.json';
import es from '@/i18n/locales/es.json';

const dictionaries: Record<string, Dictionary> = { en, es };

export function ClientLayout({
  locale: serverLocale,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const theme = useUIStore((s) => s.theme);
  const zustandLocale = useUIStore((s) => s.locale);
  const [mounted, setMounted] = useState(false);

  // Use zustand locale (from localStorage) after mount, server locale before mount
  const locale = mounted ? zustandLocale : serverLocale;
  const dictionary = dictionaries[locale] ?? dictionaries.en;

  // Apply dark class to <html> based on theme preference
  useEffect(() => {
    setMounted(true);

    // Sync cookie with zustand locale on mount
    const currentLocale = useUIStore.getState().locale;
    document.cookie = `${LOCALE_COOKIE}=${currentLocale};path=/;max-age=${365 * 86400};samesite=lax`;

    function applyTheme() {
      const effective = resolveTheme(theme);
      const html = document.documentElement;
      html.classList.toggle('dark', effective === 'dark');
    }

    applyTheme();

    // Listen for system preference changes when theme is 'system'
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', applyTheme);
      return () => mq.removeEventListener('change', applyTheme);
    }
  }, [theme]);

  // Update html lang attribute when locale changes
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // Sync cookie when locale changes
  useEffect(() => {
    if (mounted) {
      document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${365 * 86400};samesite=lax`;
    }
  }, [locale, mounted]);

  return (
    <TranslationProvider dictionary={dictionary}>
      <div className="flex h-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-text-primary)]">
        {/* Desktop sidebar */}
        <Sidebar />

        {/* Mobile nav overlay */}
        <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)} />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[var(--container-main)] px-6 py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TranslationProvider>
  );
}
