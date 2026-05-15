import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LOCALES = ['en', 'es'];
const DEFAULT_LOCALE = 'en';
const LOCALE_COOKIE = 'memento-locale';

/**
 * Middleware: i18n locale routing only.
 *
 * Local web-ui does NOT require authentication.
 * Auth is only needed for cloud sync (handled via OAuth Device Flow in browser).
 */
export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── i18n locale prefix ─────────────────────────────────
  const maybeLocale = pathname.split('/')[1];

  if (!LOCALES.includes(maybeLocale)) {
    const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
    const locale =
      cookieLocale && LOCALES.includes(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

    const newPath = pathname === '/' ? `/${locale}/dashboard` : `/${locale}${pathname}`;
    const url = request.nextUrl.clone();
    url.pathname = newPath;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\..*|docs\\/content).*)',
  ],
};
