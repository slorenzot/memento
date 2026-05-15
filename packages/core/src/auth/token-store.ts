import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import type { StoredAuth, TokenResponse, TokenUserInfo } from './types.js';

const AUTH_DIR = join(homedir(), '.memento');
const AUTH_FILE = 'auth.json';

/**
 * Manages OAuth token persistence in ~/.memento/auth.json.
 *
 * This is SEPARATE from the main config (~/.memento/config.json)
 * because auth tokens are sensitive and shouldn't be in project config.
 */
export class TokenStore {
  private readonly filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath ?? join(AUTH_DIR, AUTH_FILE);
  }

  /**
   * Get the stored auth token, if any.
   * Returns null if no token is stored or if it's expired.
   */
  getToken(): StoredAuth | null {
    if (!existsSync(this.filePath)) {
      return null;
    }

    try {
      const raw = readFileSync(this.filePath, 'utf-8');
      const auth = JSON.parse(raw) as StoredAuth;

      // Validate structure
      if (!auth.accessToken || !auth.expiresAt || !auth.serverUrl) {
        return null;
      }

      return auth;
    } catch {
      // Corrupted file — treat as no auth
      return null;
    }
  }

  /**
   * Check if the user is currently authenticated with a valid (non-expired) token.
   */
  isAuthenticated(): boolean {
    const auth = this.getToken();
    if (!auth) return false;
    return Date.now() < auth.expiresAt;
  }

  /**
   * Get user info from the stored token, if available.
   */
  getUser(): TokenUserInfo | null {
    const auth = this.getToken();
    return auth?.user ?? null;
  }

  /**
   * Get the server URL from the stored token.
   */
  getServerUrl(): string | null {
    const auth = this.getToken();
    return auth?.serverUrl ?? null;
  }

  /**
   * Save a token response as the stored auth.
   */
  setToken(token: TokenResponse, serverUrl: string): StoredAuth {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const auth: StoredAuth = {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      tokenType: (token.token_type || 'Bearer') as 'Bearer',
      expiresAt: token.expires_in
        ? Date.now() + token.expires_in * 1000
        : Date.now() + 365 * 24 * 60 * 60 * 1000, // Default 1 year if no expiry
      user: token.user,
      serverUrl,
      storedAt: Date.now(),
    };

    writeFileSync(this.filePath, JSON.stringify(auth, null, 2), 'utf-8');
    return auth;
  }

  /**
   * Clear the stored token (logout).
   */
  clearToken(): boolean {
    if (!existsSync(this.filePath)) {
      return false;
    }

    const raw = readFileSync(this.filePath, 'utf-8');
    writeFileSync(this.filePath, JSON.stringify({}, null, 2), 'utf-8');
    return raw.trim().length > 2; // Was there actual data?
  }

  /**
   * Get time remaining until token expires, in seconds.
   * Returns 0 if no token or already expired.
   */
  getTimeUntilExpiry(): number {
    const auth = this.getToken();
    if (!auth) return 0;
    const remaining = Math.max(0, Math.floor((auth.expiresAt - Date.now()) / 1000));
    return remaining;
  }

  /**
   * Get the file path where auth is stored (useful for display).
   */
  getFilePath(): string {
    return this.filePath;
  }
}
