'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Search,
  Clock,
  Activity,
  PanelLeftClose,
  PanelLeft,
  Settings,
} from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { MementoLogo } from './MementoLogo';
import clsx from 'clsx';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/observations', label: 'Observations', icon: FileText },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/timeline', label: 'Timeline', icon: Clock },
  { href: '/sessions', label: 'Sessions', icon: Activity },
];

const bottomItems = [
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);

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
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
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
        {bottomItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
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
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeft className="w-[18px] h-[18px] shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="w-[18px] h-[18px] shrink-0" />
              <span className="ml-3">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
