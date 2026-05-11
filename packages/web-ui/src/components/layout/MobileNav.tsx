'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Search, Clock, Activity, X } from 'lucide-react';
import { MementoLogo } from './MementoLogo';
import { useT } from '@/i18n/translation-context';
import clsx from 'clsx';

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const t = useT();

  const navItems = [
    { href: '/', label: t.nav.dashboard, icon: LayoutDashboard },
    { href: '/observations', label: t.nav.observations, icon: FileText },
    { href: '/search', label: t.nav.search, icon: Search },
    { href: '/timeline', label: t.nav.timeline, icon: Clock },
    { href: '/sessions', label: t.nav.sessions, icon: Activity },
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="absolute inset-y-0 left-0 w-[240px] bg-[var(--color-bg)] border-r border-[var(--color-border)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-[var(--color-border)]">
          <MementoLogo size={110} collapsed={false} />
          <button
            onClick={onClose}
            className="text-[var(--color-secondary)] hover:text-[var(--color-text-primary)]"
            aria-label={t.nav.closeMenu}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={clsx(
                  'flex items-center gap-3 rounded-[var(--radius-xl)] px-3 py-2 text-[14px] transition-colors',
                  isActive
                    ? 'bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] font-medium'
                    : 'text-[var(--color-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]'
                )}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
