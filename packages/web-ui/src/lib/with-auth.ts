import { verifyRequest } from '@/lib/auth-tokens';
import { error, handleRoute } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

/**
 * Authenticated route handler wrapper.
 *
 * Validates Bearer token from Authorization header and injects
 * userId and email into the handler context.
 *
 * Usage:
 * ```ts
 * export async function GET(request: Request) {
 *   return withAuth(request, async (auth) => {
 *     // auth.userId, auth.email available here
 *     return ok(data);
 *   });
 * }
 * ```
 */
export function withAuth(
  request: Request,
  handler: (auth: { userId: string; email: string }) => Promise<NextResponse>,
): Promise<NextResponse> {
  return handleRoute(async () => {
    const auth = await verifyRequest(request);

    if (!auth.authenticated) {
      return error(auth.error || 'Authentication required', 401);
    }

    return handler({ userId: auth.userId!, email: auth.email! });
  });
}
