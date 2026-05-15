import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { TokenStore } from './token-store.js';
import type { TokenResponse, StoredAuth } from './types.js';

const TEST_DIR = join(process.cwd(), 'test-data', 'auth');

function createTestStore(): { store: TokenStore; testFile: string } {
  if (!existsSync(TEST_DIR)) {
    mkdirSync(TEST_DIR, { recursive: true });
  }
  const testFile = join(TEST_DIR, `auth-test-${Date.now()}-${Math.random().toString(36).slice(7)}.json`);
  return { store: new TokenStore(testFile), testFile };
}

function makeTokenResponse(overrides: Partial<TokenResponse> = {}): TokenResponse {
  return {
    access_token: 'test-access-token-123',
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: 'test-refresh-token-456',
    user: { email: 'test@example.com', name: 'Test User' },
    ...overrides,
  };
}

describe('TokenStore', () => {
  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('getToken', () => {
    it('returns null when no auth file exists', () => {
      const { store } = createTestStore();
      expect(store.getToken()).toBeNull();
    });

    it('returns stored auth when file exists', () => {
      const { store } = createTestStore();
      const token = makeTokenResponse();
      store.setToken(token, 'https://test.example.com');

      const auth = store.getToken();
      expect(auth).not.toBeNull();
      expect(auth!.accessToken).toBe('test-access-token-123');
      expect(auth!.tokenType).toBe('Bearer');
      expect(auth!.serverUrl).toBe('https://test.example.com');
      expect(auth!.user?.email).toBe('test@example.com');
    });

    it('returns null for corrupted file', () => {
      const { store, testFile } = createTestStore();
      writeFileSync(testFile, 'not valid json{{{', 'utf-8');
      expect(store.getToken()).toBeNull();
    });

    it('returns null for file with missing required fields', () => {
      const { store, testFile } = createTestStore();
      writeFileSync(testFile, JSON.stringify({ foo: 'bar' }), 'utf-8');
      expect(store.getToken()).toBeNull();
    });
  });

  describe('setToken', () => {
    it('creates auth file with correct structure', () => {
      const { store, testFile } = createTestStore();
      const token = makeTokenResponse();

      const auth = store.setToken(token, 'https://server.example.com');

      expect(existsSync(testFile)).toBe(true);
      expect(auth.accessToken).toBe('test-access-token-123');
      expect(auth.refreshToken).toBe('test-refresh-token-456');
      expect(auth.tokenType).toBe('Bearer');
      expect(auth.serverUrl).toBe('https://server.example.com');
      expect(auth.storedAt).toBeGreaterThan(0);
      expect(auth.expiresAt).toBeGreaterThan(Date.now());
    });

    it('persists to disk and can be read back', () => {
      const { store } = createTestStore();
      const token = makeTokenResponse();

      store.setToken(token, 'https://server.example.com');

      const auth = store.getToken();
      expect(auth).not.toBeNull();
      expect(auth!.accessToken).toBe('test-access-token-123');
    });

    it('overwrites previous token', () => {
      const { store } = createTestStore();
      const token1 = makeTokenResponse({ access_token: 'token-1' });
      const token2 = makeTokenResponse({ access_token: 'token-2' });

      store.setToken(token1, 'https://server1.example.com');
      store.setToken(token2, 'https://server2.example.com');

      const auth = store.getToken();
      expect(auth!.accessToken).toBe('token-2');
      expect(auth!.serverUrl).toBe('https://server2.example.com');
    });

    it('creates directory if it does not exist', () => {
      const nestedDir = join(TEST_DIR, 'nested', 'deep');
      const testFile = join(nestedDir, 'auth.json');
      const store = new TokenStore(testFile);

      const token = makeTokenResponse();
      store.setToken(token, 'https://test.example.com');

      expect(existsSync(testFile)).toBe(true);
    });
  });

  describe('isAuthenticated', () => {
    it('returns false when no token exists', () => {
      const { store } = createTestStore();
      expect(store.isAuthenticated()).toBe(false);
    });

    it('returns true for valid non-expired token', () => {
      const { store } = createTestStore();
      const token = makeTokenResponse({ expires_in: 3600 });
      store.setToken(token, 'https://test.example.com');
      expect(store.isAuthenticated()).toBe(true);
    });

    it('returns false for expired token', () => {
      const { store, testFile } = createTestStore();

      // Write an expired token directly
      const expiredAuth: StoredAuth = {
        accessToken: 'expired-token',
        tokenType: 'Bearer',
        expiresAt: Date.now() - 1000, // 1 second ago
        serverUrl: 'https://test.example.com',
        storedAt: Date.now() - 7200000,
      };
      writeFileSync(testFile, JSON.stringify(expiredAuth), 'utf-8');

      expect(store.isAuthenticated()).toBe(false);
    });
  });

  describe('clearToken', () => {
    it('returns false when no auth file exists', () => {
      const { store } = createTestStore();
      expect(store.clearToken()).toBe(false);
    });

    it('returns true and clears token when auth exists', () => {
      const { store } = createTestStore();
      store.setToken(makeTokenResponse(), 'https://test.example.com');

      const result = store.clearToken();
      expect(result).toBe(true);
      expect(store.getToken()).toBeNull();
    });
  });

  describe('getUser', () => {
    it('returns null when no token', () => {
      const { store } = createTestStore();
      expect(store.getUser()).toBeNull();
    });

    it('returns user info from stored token', () => {
      const { store } = createTestStore();
      const token = makeTokenResponse({
        user: { email: 'user@test.com', name: 'Test User', image: 'https://img.test/avatar.png' },
      });
      store.setToken(token, 'https://test.example.com');

      const user = store.getUser();
      expect(user).not.toBeNull();
      expect(user!.email).toBe('user@test.com');
      expect(user!.name).toBe('Test User');
      expect(user!.image).toBe('https://img.test/avatar.png');
    });
  });

  describe('getServerUrl', () => {
    it('returns null when no token', () => {
      const { store } = createTestStore();
      expect(store.getServerUrl()).toBeNull();
    });

    it('returns server URL from stored token', () => {
      const { store } = createTestStore();
      store.setToken(makeTokenResponse(), 'https://custom.example.com');
      expect(store.getServerUrl()).toBe('https://custom.example.com');
    });
  });

  describe('getTimeUntilExpiry', () => {
    it('returns 0 when no token', () => {
      const { store } = createTestStore();
      expect(store.getTimeUntilExpiry()).toBe(0);
    });

    it('returns remaining seconds for valid token', () => {
      const { store } = createTestStore();
      store.setToken(makeTokenResponse({ expires_in: 3600 }), 'https://test.example.com');
      const remaining = store.getTimeUntilExpiry();
      // Should be approximately 3600 seconds (within 1 second tolerance)
      expect(remaining).toBeGreaterThan(3598);
      expect(remaining).toBeLessThanOrEqual(3600);
    });

    it('returns 0 for expired token', () => {
      const { store, testFile } = createTestStore();
      const expiredAuth: StoredAuth = {
        accessToken: 'expired',
        tokenType: 'Bearer',
        expiresAt: Date.now() - 10000,
        serverUrl: 'https://test.example.com',
        storedAt: Date.now() - 20000,
      };
      writeFileSync(testFile, JSON.stringify(expiredAuth), 'utf-8');
      expect(store.getTimeUntilExpiry()).toBe(0);
    });
  });

  describe('getFilePath', () => {
    it('returns the file path', () => {
      const { store, testFile } = createTestStore();
      expect(store.getFilePath()).toBe(testFile);
    });
  });
});
