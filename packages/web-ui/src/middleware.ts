import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authConfig } from '@/lib/auth.config';

const LOCALES = ['en', 'es'];
const DEFAULT_LOCALE = 'en';
const LOCALE_COOKIE = 'memento-locale';

/**
 * Combined middleware: i18n locale routing + authentication.
 *
 * Uses Auth.js v5's middleware pattern with edge-compatible config.
 * The full auth config (with credentials provider) lives in auth.ts (Node.js).
 */
const { auth } = NextAuth(authConfig);

export default auth(async (request) => {
  const { pathname } = request.nextUrl;
  const auth = (request as any).auth;

  // ── Step 1: i18n locale prefix ──────────────────────────
  const maybeLocale = pathname.split('/')[1];

  if (!LOCALES.includes(maybeLocale)) {
    // No locale prefix → add it
    const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
    const locale =
      cookieLocale && LOCALES.includes(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

    const newPath = pathname === '/' ? `/${locale}/dashboard` : `/${locale}${pathname}`;
    const url = request.nextUrl.clone();
    url.pathname = newPath;
    return NextResponse.redirect(url);
  }

  // ── Step 2: Public routes (no auth required) ────────────
  const isPublicRoute =
    pathname.includes('/login') ||
    pathname.includes('/register');

  if (isPublicRoute) {
    // If already logged in and visiting login, redirect to dashboard
    if (auth?.user) {
      const url = request.nextUrl.clone();
      url.pathname = `/${maybeLocale}/dashboard`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ── Step 3: Protected routes (auth required) ────────────
  if (!auth?.user) {
    const url = request.nextUrl.clone();
    url.pathname = `/${maybeLocale}/login`;
    // Save the original URL so we can redirect back after login
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!api|_next|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\..*|docs\\/content).*)',
  ],
};
