'use client';

import { usePathname } from 'next/navigation';
import { LOCALES } from './config';

/**
 * Detects the locale prefix from the current URL pathname.
 *
 * Returns `""` for English (default) or `"/es"` for Spanish.
 * Used by client components to build locale-aware navigation links.
 *
 * @example
 * const prefix = useLocalePrefix();
 * <Link href={`${prefix}/mementos`}>Mementos</Link>
 */
export function useLocalePrefix(): string {
  const pathname = usePathname();

  for (const locale of LOCALES) {
    if (locale === 'en') continue;
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return `/${locale}`;
    }
  }

  return '';
}
