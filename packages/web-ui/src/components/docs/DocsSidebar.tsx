'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { docsNav, type DocNavItem } from './docs-nav';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useT } from '@/i18n/translation-context';

interface DocsSidebarProps {
  lang?: string;
}

function NavGroup({ item, depth = 0, lang }: { item: DocNavItem; depth?: number; lang?: string }) {
  const pathname = usePathname();
  const t = useT();
  const [open, setOpen] = useState(true);

  const hasChildren = item.children && item.children.length > 0;
  const navTitle = item.navKey
    ? (t.docs.nav as Record<string, string>)[item.navKey] ?? item.title
    : item.title;

  // Build locale-aware prefix
  const prefix = lang ? `/${lang}/docs` : '/docs';

  if (hasChildren) {
    return (
      <div className="mb-0.5">
        <button
          onClick={() => setOpen(!open)}
          className={clsx(
            'flex items-center justify-between w-full px-2 py-1 text-[12px] font-semibold uppercase tracking-wider text-[var(--color-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors',
            depth > 0 && 'pl-4',
          )}
        >
          <span>{navTitle}</span>
          <ChevronDown
            className={clsx(
              'w-3 h-3 transition-transform',
              !open && '-rotate-90',
            )}
          />
        </button>
        {open && (
          <div className="mt-0.5">
            {item.children!.map((child) => (
              <NavGroup key={child.slug ?? child.title} item={child} depth={depth + 1} lang={lang} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const href = item.slug ? `${prefix}/${item.slug}` : '#';
  const isActive = item.slug ? pathname === `${prefix}/${item.slug}` : false;

  return (
    <Link
      href={href}
      className={clsx(
        'block px-2 py-1 text-[13px] rounded-md transition-colors truncate',
        depth > 0 && 'pl-4',
        isActive
          ? 'text-[var(--color-text-primary)] font-medium'
          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
      )}
    >
      {navTitle}
    </Link>
  );
}

export function DocsSidebar({ lang }: DocsSidebarProps) {
  return (
    <nav className="sticky top-8 py-2 space-y-0.5">
      {docsNav.map((item) => (
        <NavGroup key={item.slug ?? item.title} item={item} lang={lang} />
      ))}
    </nav>
  );
}
