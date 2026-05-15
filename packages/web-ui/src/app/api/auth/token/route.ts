import { authenticateUser } from '@/lib/auth-db';
import { createApiToken } from '@/lib/auth-tokens';
import { ok, badRequest, error, handleRoute } from '@/lib/api-helpers';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const tokenRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * POST /api/auth/token — Exchange email+password for a Bearer token.
 *
 * Used by the CLI/TUI to authenticate for sync operations.
 * Returns a JWT token valid for 30 days.
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest('Invalid JSON body');
    }

    const parsed = tokenRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(`Validation error: ${parsed.error.issues.map(i => i.message).join(', ')}`);
    }

    const { email, password } = parsed.data;

    const user = authenticateUser(email, password);
    if (!user) {
      return error('Invalid email or password', 401);
    }

    const token = createApiToken(user.id, user.email, user.name);

    return ok(token);
  });
}
