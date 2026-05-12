import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LOCALES = ['en', 'es'];
const DEFAULT_LOCALE = 'en';
const LOCALE_COOKIE = 'memento-locale';

/**
 * Next.js middleware for i18n locale routing.
 *
 * Intercepts all non-API, non-static requests and ensures they have
 * a locale prefix in the URL (e.g. /es/observations).
 *
 * Flow:
 * 1. Path already has valid locale (/en/*, /es/*) → pass through
 * 2. Path missing locale (/observations) → read cookie → redirect to /{locale}/observations
 * 3. Root (/) → redirect to /{locale}/dashboard
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if path already has a valid locale prefix
  const maybeLocale = pathname.split('/')[1];

  if (LOCALES.includes(maybeLocale)) {
    return NextResponse.next();
  }

  // No locale prefix → resolve from cookie, fallback to default
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale =
    cookieLocale && LOCALES.includes(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  // Root → dashboard, otherwise prefix existing path with locale
  const newPath = pathname === '/' ? `/${locale}/dashboard` : `/${locale}${pathname}`;

  const url = request.nextUrl.clone();
  url.pathname = newPath;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next (Next.js internals)
     * - favicon.ico, sitemap.xml, robots.txt
     * - Static files (images, fonts, etc.)
     */
    '/((?!api|_next|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\..*|docs\\/content).*)',
  ],
};
