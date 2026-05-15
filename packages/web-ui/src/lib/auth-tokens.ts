import { createHmac, timingSafeEqual } from 'crypto';
import { getUserById } from './auth-db';

// ─── Types ──────────────────────────────────────────────────

export interface ApiTokenPayload {
  sub: string;     // user ID
  email: string;
  iat: number;     // issued at (unix epoch seconds)
  exp: number;     // expires at (unix epoch seconds)
}

export interface ApiTokenResult {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

// ─── Token Creation & Verification ──────────────────────────

const TOKEN_ALGORITHM = 'HS256';
const TOKEN_LIFETIME = 30 * 24 * 60 * 60; // 30 days in seconds

function base64urlEncode(data: string): string {
  return Buffer.from(data).toString('base64url');
}

function base64urlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf-8');
}

function getSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET environment variable is required');
  }
  return secret;
}

/**
 * Create a signed API token (JWT-like format).
 */
export function createApiToken(userId: string, email: string, name: string | null): ApiTokenResult {
  const now = Math.floor(Date.now() / 1000);
  const payload: ApiTokenPayload = {
    sub: userId,
    email,
    iat: now,
    exp: now + TOKEN_LIFETIME,
  };

  const header = base64urlEncode(JSON.stringify({ alg: TOKEN_ALGORITHM, typ: 'JWT' }));
  const payloadEncoded = base64urlEncode(JSON.stringify(payload));
  const signature = createHmac('sha256', getSecret())
    .update(`${header}.${payloadEncoded}`)
    .digest('base64url');

  const access_token = `${header}.${payloadEncoded}.${signature}`;

  return {
    access_token,
    token_type: 'Bearer',
    expires_in: TOKEN_LIFETIME,
    user: { id: userId, email, name },
  };
}

/**
 * Verify and decode an API token.
 * Returns the payload if valid, null if invalid or expired.
 */
export function verifyApiToken(token: string): ApiTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;

  // Verify signature
  const expectedSignature = createHmac('sha256', getSecret())
    .update(`${header}.${payload}`)
    .digest('base64url');

  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }
  } catch {
    return null; // Length mismatch
  }

  // Decode payload
  try {
    const decoded = JSON.parse(base64urlDecode(payload)) as ApiTokenPayload;

    // Check expiry
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Extract Bearer token from Authorization header.
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

/**
 * Full auth verification: extract token from request, verify it,
 * and return the authenticated user.
 */
export async function verifyRequest(request: Request): Promise<{
  authenticated: boolean;
  userId?: string;
  email?: string;
  error?: string;
}> {
  const authHeader = request.headers.get('Authorization');
  const token = extractBearerToken(authHeader);

  if (!token) {
    return { authenticated: false, error: 'Missing Authorization header. Use: Bearer <token>' };
  }

  const payload = verifyApiToken(token);

  if (!payload) {
    return { authenticated: false, error: 'Invalid or expired token. Run `memento login` again.' };
  }

  // Verify user still exists
  const user = getUserById(payload.sub);
  if (!user) {
    return { authenticated: false, error: 'User not found.' };
  }

  return {
    authenticated: true,
    userId: payload.sub,
    email: payload.email,
  };
}
