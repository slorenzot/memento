import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authenticateUser } from './auth-db';
import { authConfig } from './auth.config';

/**
 * NextAuth.js v5 configuration.
 *
 * Uses Credentials provider (email + password) with JWT session strategy.
 * The users table lives in a separate auth.db (managed by auth-db.ts).
 *
 * Splits config: auth.config.ts has edge-compatible parts (for middleware),
 * this file adds the Node.js-specific credentials provider.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = authenticateUser(
          credentials.email as string,
          credentials.password as string,
        );

        if (!user) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string | null;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
});

/**
 * Helper to get the current session in Server Components and Route Handlers.
 * Returns null if not authenticated.
 */
export async function getSession() {
  return auth();
}

/**
 * Helper that requires authentication.
 * Throws a redirect to /login if not authenticated.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  return session;
}
