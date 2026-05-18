'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Search,
  Clock,
  Activity,
  FolderKanban,
  PanelLeftClose,
  PanelLeft,
  Settings,
  BookOpen,
} from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { MementoLogo } from './MementoLogo';
import { useT } from '@/i18n/translation-context';
import { useLocalePrefix } from '@/i18n/use-locale-prefix';
import clsx from 'clsx';

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);
  const t = useT();
  const prefix = useLocalePrefix();

  const navItems = [
    { href: `${prefix}/dashboard`, label: t.nav.dashboard, icon: LayoutDashboard, rawPath: '/dashboard' },
    { href: `${prefix}/mementos`, label: t.nav.observations, icon: FileText, rawPath: '/mementos' },
    { href: `${prefix}/search`, label: t.nav.search, icon: Search, rawPath: '/search' },
    { href: `${prefix}/timeline`, label: t.nav.timeline, icon: Clock, rawPath: '/timeline' },
    { href: `${prefix}/sessions`, label: t.nav.sessions, icon: Activity, rawPath: '/sessions' },
    { href: `${prefix}/projects`, label: t.nav.projects, icon: FolderKanban, rawPath: '/projects' },
  ];

  const bottomItems = [
    { href: `${prefix}/docs`, label: t.nav.docs, icon: BookOpen, rawPath: '/docs' },
    { href: `${prefix}/settings`, label: t.nav.settings, icon: Settings, rawPath: '/settings' },
  ];

  return (
    <aside
      className={clsx(
        'hidden md:flex flex-col border-r border-[var(--color-border)] bg-[var(--color-bg)] transition-[width] duration-200 ease-in-out h-screen sticky top-0',
        collapsed ? 'w-[64px]' : 'w-[240px]',
      )}
    >
      {/* Logo */}
      <div className={clsx('flex items-center h-14 px-4 border-b border-[var(--color-border)]', collapsed && 'justify-center')}>
        <MementoLogo size={22} collapsed={collapsed} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map(({ href, label, icon: Icon, rawPath }) => {
          const isActive = pathname === `${prefix}${rawPath}` || pathname.startsWith(`${prefix}${rawPath}/`);
          return (
            <Link
              key={rawPath}
              href={href}
              className={clsx(
                'flex items-center gap-3 rounded-[var(--radius-xl)] px-3 py-2 text-[14px] transition-colors',
                collapsed && 'justify-center px-2',
                isActive
                  ? 'bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] font-medium'
                  : 'text-[var(--color-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]',
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom nav — Settings */}
      <div className="border-t border-[var(--color-border)] py-2 px-2 space-y-1">
        {bottomItems.map(({ href, label, icon: Icon, rawPath }) => {
          const isActive = pathname === `${prefix}${rawPath}` || pathname.startsWith(`${prefix}${rawPath}/`);
          return (
            <Link
              key={rawPath}
              href={href}
              className={clsx(
                'flex items-center gap-3 rounded-[var(--radius-xl)] px-3 py-2 text-[14px] transition-colors',
                collapsed && 'justify-center px-2',
                isActive
                  ? 'bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] font-medium'
                  : 'text-[var(--color-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]',
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </div>

      {/* Collapse toggle */}
      <div className="border-t border-[var(--color-border)] p-2">
        <button
          onClick={toggle}
          className={clsx(
            'flex items-center w-full rounded-[var(--radius-xl)] px-3 py-2 text-[14px] text-[var(--color-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] transition-colors',
            collapsed && 'justify-center px-2',
          )}
          aria-label={collapsed ? t.nav.expandSidebar : t.nav.collapseSidebar}
        >
          {collapsed ? (
            <PanelLeft className="w-[18px] h-[18px] shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="w-[18px] h-[18px] shrink-0" />
              <span className="ml-3">{t.nav.collapse}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
