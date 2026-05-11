'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { useUIStore, resolveTheme } from '@/stores/ui-store';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const theme = useUIStore((s) => s.theme);
  const [mounted, setMounted] = useState(false);

  // Apply dark class to <html> based on theme preference
  useEffect(() => {
    setMounted(true);

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

  return (
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
  );
}
