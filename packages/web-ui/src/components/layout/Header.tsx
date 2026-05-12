'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search, Menu } from 'lucide-react';
import { useT } from '@/i18n/translation-context';

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const router = useRouter();
  const t = useT();
  const [searchQuery, setSearchQuery] = useState('');

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  }

  return (
    <header className="sticky top-0 z-30 flex items-center h-14 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 md:px-6">
      {/* Mobile menu button */}
      <button
        className="md:hidden mr-3 text-[var(--color-secondary)] hover:text-[var(--color-text-primary)]"
        onClick={onMobileMenuToggle}
        aria-label={t.nav.toggleMenu}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search bar — centered */}
      <form onSubmit={handleSearch} className="flex-1 flex justify-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-tertiary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.header.searchPlaceholder}
            className="w-full rounded-full bg-[var(--color-neutral-bg)] border border-transparent py-2 pl-9 pr-4 text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-tertiary)] focus:outline-none focus:bg-[var(--color-bg)] focus:border-[var(--color-border-strong)] transition-colors"
          />
          <kbd className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-0.5 rounded bg-[var(--color-bg)] border border-[var(--color-border)] px-1.5 py-0.5 text-[11px] text-[var(--color-tertiary)]">
            <span className="text-[10px]">⌘</span>K
          </kbd>
        </div>
      </form>
    </header>
  );
}
