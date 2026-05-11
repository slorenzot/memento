/**
 * Server-side dictionary access.
 *
 * In Server Components, read locale from cookie and import the JSON dictionary.
 * In Client Components, use the TranslationContext instead.
 */

import type { Locale } from './config';
import en from './locales/en.json';
import es from './locales/es.json';

export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = { en, es };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.en;
}

/**
 * Get locale from cookie (for Server Components).
 * Next.js 15 requires `await cookies()`.
 */
export async function getLocaleFromCookie(): Promise<Locale> {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const locale = cookieStore.get('memento-locale')?.value;
    if (locale === 'en' || locale === 'es') return locale;
  } catch {
    // cookies() not available (e.g. during build)
  }
  return 'en';
}
