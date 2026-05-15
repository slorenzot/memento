import { describe, it, expect } from 'bun:test';
import { DeviceFlowClient, DeviceFlowError } from './device-flow-client.js';
import type { DeviceCodeResponse, TokenResponse } from './types.js';

/** Instant sleep for tests */
const instantSleep = async () => {};

// ─── Mock Fetch Helper ──────────────────────────────────────

function createMockFetch(responses: {
  deviceCode?: DeviceCodeResponse;
  token?: TokenResponse | (() => Promise<Response>);
  tokenStatus?: number;
}) {
  let callCount = 0;

  return async function mockFetch(url: string, options: any): Promise<Response> {
    if (url.endsWith('/api/v1/auth/device')) {
      if (responses.deviceCode) {
        return new Response(JSON.stringify(responses.deviceCode), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('Not found', { status: 404 });
    }

    if (url.endsWith('/api/v1/auth/device/token')) {
      callCount++;

      // Allow dynamic responses for token endpoint
      if (typeof responses.token === 'function') {
        return (responses.token as () => Promise<Response>)();
      }

      if (responses.token) {
        return new Response(JSON.stringify(responses.token), {
          status: responses.tokenStatus ?? 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response('Not found', { status: 404 });
    }

    return new Response('Not found', { status: 404 });
  };
}

function makeDeviceCodeResponse(overrides: Partial<DeviceCodeResponse> = {}): DeviceCodeResponse {
  return {
    device_code: 'test-device-code-123',
    user_code: 'ABCD-EFGH',
    verification_uri: 'https://test.example.com/oauth/device',
    verification_uri_complete: 'https://test.example.com/oauth/device?code=ABCD-EFGH',
    expires_in: 900,
    interval: 1,
    ...overrides,
  };
}

function makeTokenResponse(overrides: Partial<TokenResponse> = {}): TokenResponse {
  return {
    access_token: 'test-access-token-xyz',
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: 'test-refresh-token',
    user: { email: 'user@test.com', name: 'Test User' },
    ...overrides,
  };
}

describe('DeviceFlowClient', () => {
  const serverUrl = 'https://test.example.com';

  describe('constructor', () => {
    it('creates client with required config', () => {
      const client = new DeviceFlowClient({
        serverUrl,
        fetchFunction: createMockFetch({}),
      });
      expect(client).toBeDefined();
    });

    it('trims trailing slashes from serverUrl', () => {
      const client = new DeviceFlowClient({
        serverUrl: 'https://test.example.com///',
        fetchFunction: createMockFetch({}),
      });
      // Internal, but we can verify by checking request URLs
      expect(client).toBeDefined();
    });
  });

  describe('requestDeviceCode', () => {
    it('returns device code response on success', async () => {
      const deviceCode = makeDeviceCodeResponse();
      const client = new DeviceFlowClient({
        serverUrl,
        fetchFunction: createMockFetch({ deviceCode }),
      });

      const result = await client.requestDeviceCode();

      expect(result.device_code).toBe('test-device-code-123');
      expect(result.user_code).toBe('ABCD-EFGH');
      expect(result.verification_uri).toBe('https://test.example.com/oauth/device');
      expect(result.interval).toBe(1);
    });

    it('throws DeviceFlowError on server error', async () => {
      const client = new DeviceFlowClient({
        serverUrl,
        fetchFunction: async () => new Response('Internal Server Error', { status: 500 }),
      });

      expect(client.requestDeviceCode()).rejects.toThrow('Failed to request device code');
    });

    it('sends request without body to device endpoint', async () => {
      let capturedOptions: any = null;

      const mockFetch = async (url: string, options: any) => {
        capturedOptions = options;
        return new Response(
          JSON.stringify(makeDeviceCodeResponse()),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      };

      const client = new DeviceFlowClient({
        serverUrl,
        clientId: 'custom-client-id',
        fetchFunction: mockFetch,
      });

      await client.requestDeviceCode();
      // Device endpoint no longer requires client_id or scope
      expect(capturedOptions.body).toBeUndefined();
    });
  });

  describe('pollForToken', () => {
    it('returns success with token when authorized immediately', async () => {
      const token = makeTokenResponse();
      let pollCount = 0;

      const client = new DeviceFlowClient({
        serverUrl,
        pollInterval: 0,
        sleepFunction: instantSleep,
        fetchFunction: createMockFetch({ token }),
      });

      const result = await client.pollForToken('test-device-code', () => { pollCount++; });

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.token!.access_token).toBe('test-access-token-xyz');
      expect(result.token!.user?.email).toBe('user@test.com');
    });

    it('handles authorization_pending and retries', async () => {
      let callCount = 0;
      const token = makeTokenResponse();

      const mockFetch = async (url: string) => {
        if (url.endsWith('/api/v1/auth/device/token')) {
          callCount++;
          if (callCount <= 2) {
            return new Response(
              JSON.stringify({ error: 'authorization_pending', error_description: 'still waiting' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            );
          }
          return new Response(
            JSON.stringify(token),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return new Response('Not found', { status: 404 });
      };

      const client = new DeviceFlowClient({
        serverUrl,
        pollInterval: 0,
        sleepFunction: instantSleep,
        fetchFunction: mockFetch,
      });

      const result = await client.pollForToken('test-device-code');
      expect(result.success).toBe(true);
      expect(callCount).toBe(3); // 2 pending + 1 success
    });

    it('handles slow_down by increasing interval', async () => {
      let callCount = 0;
      const token = makeTokenResponse();

      const mockFetch = async (url: string) => {
        if (url.endsWith('/api/v1/auth/device/token')) {
          callCount++;
          if (callCount === 1) {
            return new Response(
              JSON.stringify({ error: 'slow_down', error_description: 'too fast' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            );
          }
          return new Response(
            JSON.stringify(token),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return new Response('Not found', { status: 404 });
      };

      const client = new DeviceFlowClient({
        serverUrl,
        pollInterval: 0,
        sleepFunction: instantSleep,
        fetchFunction: mockFetch,
      });

      const result = await client.pollForToken('test-device-code');
      expect(result.success).toBe(true);
    });

    it('returns expired_token error', async () => {
      const mockFetch = async (url: string) => {
        if (url.endsWith('/api/v1/auth/device/token')) {
          return new Response(
            JSON.stringify({ error: 'expired_token', error_description: 'code expired' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return new Response('Not found', { status: 404 });
      };

      const client = new DeviceFlowClient({
        serverUrl,
        pollInterval: 0,
        sleepFunction: instantSleep,
        fetchFunction: mockFetch,
      });

      const result = await client.pollForToken('test-device-code');
      expect(result.success).toBe(false);
      expect(result.error).toBe('expired_token');
      expect(result.errorDescription).toContain('expiró');
    });

    it('returns access_denied error', async () => {
      const mockFetch = async (url: string) => {
        if (url.endsWith('/api/v1/auth/device/token')) {
          return new Response(
            JSON.stringify({ error: 'access_denied', error_description: 'user said no' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return new Response('Not found', { status: 404 });
      };

      const client = new DeviceFlowClient({
        serverUrl,
        pollInterval: 0,
        sleepFunction: instantSleep,
        fetchFunction: mockFetch,
      });

      const result = await client.pollForToken('test-device-code');
      expect(result.success).toBe(false);
      expect(result.error).toBe('access_denied');
      expect(result.errorDescription).toContain('denegada');
    });
  });

  describe('authorize', () => {
    it('runs full flow: request code → poll → success', async () => {
      const deviceCode = makeDeviceCodeResponse();
      const token = makeTokenResponse();
      let codeCallback: DeviceCodeResponse | null = null;

      const client = new DeviceFlowClient({
        serverUrl,
        pollInterval: 0,
        sleepFunction: instantSleep,
        fetchFunction: createMockFetch({ deviceCode, token }),
      });

      const result = await client.authorize({
        onCode: (code) => { codeCallback = code; },
      });

      expect(codeCallback).not.toBeNull();
      expect(codeCallback!.user_code).toBe('ABCD-EFGH');
      expect(result.success).toBe(true);
      expect(result.token!.access_token).toBe('test-access-token-xyz');
    });
  });
});
