/**
 * i18n configuration for Memento Web UI.
 *
 * - Supports English (default) and Spanish
 * - Locale stored in cookie `memento-locale` for Server Component access
 * - Locale stored in zustand/localStorage for Client Component access
 */

export const DEFAULT_LOCALE = 'en' as const;

export const LOCALES = ['en', 'es'] as const;

export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
};

export function isValidLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale);
}

export const LOCALE_COOKIE = 'memento-locale';
