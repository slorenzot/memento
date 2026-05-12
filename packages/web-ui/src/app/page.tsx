import { redirect } from 'next/navigation';
import { getLocaleFromCookie } from '@/i18n/get-dictionary';
import { DEFAULT_LOCALE } from '@/i18n/config';

/**
 * Root page — safety net redirect.
 * Middleware handles / → /{locale}/dashboard before this renders,
 * but this ensures correct behavior even if middleware is skipped.
 */
export default async function RootPage() {
  const locale = await getLocaleFromCookie();
  redirect(`/${locale ?? DEFAULT_LOCALE}/dashboard`);
}
