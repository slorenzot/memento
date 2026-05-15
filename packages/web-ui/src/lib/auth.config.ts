/**
 * Edge-compatible Auth.js configuration.
 * This file contains NO Node.js-specific imports (no better-sqlite3, no auth-db).
 * Used by middleware.ts which runs in Edge Runtime.
 */
export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    /**
     * Authorized callback — runs in Edge Runtime.
     * Checks if user is authenticated for protected routes.
     */
    authorized({ auth, request: { nextUrl } }: { auth: any; request: { nextUrl: URL } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      // Public routes — always allow
      const isPublicRoute =
        pathname.includes('/login') ||
        pathname.includes('/register') ||
        pathname === '/' ||
        pathname.startsWith('/api/');

      if (isPublicRoute) {
        // If logged in and trying to access login, redirect to dashboard
        if (isLoggedIn && pathname.includes('/login')) {
          return Response.redirect(new URL('/en/dashboard', nextUrl));
        }
        return true;
      }

      // Protected routes — require authentication
      if (!isLoggedIn) {
        return false; // Redirects to signIn page
      }

      return true;
    },
  },
  providers: [], // Providers are added in auth.ts (Node.js runtime)
};
