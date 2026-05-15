/**
 * Edge-compatible Auth.js configuration.
 *
 * NOTE: Local web-ui does NOT require authentication.
 * Auth is only for cloud sync. All routes are public.
 * Kept for backward compatibility with auth.ts (NextAuth handlers).
 */
export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    /**
     * All routes are public — local Memento works without login.
     */
    authorized() {
      return true;
    },
  },
  providers: [], // Providers are added in auth.ts (Node.js runtime)
};
