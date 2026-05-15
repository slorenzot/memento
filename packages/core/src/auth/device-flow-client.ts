import type {
  OAuthClientConfig,
  DeviceCodeResponse,
  TokenResponse,
  TokenErrorResponse,
  DeviceFlowResult,
  FetchFunction,
  SleepFunction,
} from './types.js';

const DEFAULT_POLL_INTERVAL = 5; // seconds
const DEFAULT_CLIENT_ID = 'memento-cli';

/**
 * RFC 8628 OAuth 2.0 Device Authorization Grant client.
 *
 * Usage:
 *   const client = new DeviceFlowClient({ serverUrl: 'https://memento-web.app' });
 *   const code = await client.requestDeviceCode();
 *   const result = await client.pollForToken(code.device_code);
 *   if (result.success) { save result.token }
 */
export class DeviceFlowClient {
  private readonly serverUrl: string;
  private readonly clientId: string;
  private readonly pollInterval: number;
  private readonly fetchFn: FetchFunction;
  private readonly sleepFn: SleepFunction;

  constructor(config: OAuthClientConfig) {
    this.serverUrl = config.serverUrl.replace(/\/+$/, '');
    this.clientId = config.clientId || DEFAULT_CLIENT_ID;
    this.pollInterval = config.pollInterval ?? DEFAULT_POLL_INTERVAL;
    this.fetchFn = config.fetchFunction ?? fetch;
    this.sleepFn = config.sleepFunction ?? defaultSleep;
  }

  /**
   * Step 1: Request a device code from the server.
   * POST /api/v1/auth/device
   */
  async requestDeviceCode(): Promise<DeviceCodeResponse> {
    const url = `${this.serverUrl}/api/v1/auth/device`;
    const response = await this.fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new DeviceFlowError(
        `Failed to request device code (HTTP ${response.status}): ${body}`,
        'device_code_request_failed',
      );
    }

    return response.json() as Promise<DeviceCodeResponse>;
  }

  /**
   * Step 2: Poll the token endpoint until the user authorizes or the code expires.
   * POST /api/v1/auth/device/token
   *
   * Handles all RFC 8628 error codes:
   * - authorization_pending → keep polling
   * - slow_down → increase interval by 5s
   * - expired_token → stop, code expired
   * - access_denied → stop, user denied
   */
  async pollForToken(
    deviceCode: string,
    onPoll?: (attempt: number) => void,
  ): Promise<DeviceFlowResult> {
    let interval = this.pollInterval;
    let attempt = 0;
    const startTime = Date.now();
    // Default max wait: 15 minutes (matching typical device_code lifetime)
    const maxWaitMs = 15 * 60 * 1000;

    while (Date.now() - startTime < maxWaitMs) {
      attempt++;
      onPoll?.(attempt);

      // Wait before polling (except first attempt)
      if (attempt > 1) {
        await this.sleepFn(interval * 1000);
      }

      const url = `${this.serverUrl}/api/v1/auth/device/token`;
      const response = await this.fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_code: deviceCode,
        }),
      });

      if (response.ok) {
        const token = (await response.json()) as TokenResponse;
        return { success: true, token };
      }

      // Handle error responses per RFC 8628 §3.5
      const errorBody = (await response.json().catch(() => ({
        error: 'server_error' as const,
        error_description: 'Invalid response from server',
      }))) as TokenErrorResponse;

      switch (errorBody.error) {
        case 'authorization_pending':
          // User hasn't authorized yet — keep polling
          continue;

        case 'slow_down':
          // Polling too fast — increase interval by 5 seconds
          interval += 5;
          continue;

        case 'expired_token':
          return {
            success: false,
            error: 'expired_token',
            errorDescription: 'El código expiró. Ejecuta `memento login` de nuevo.',
          };

        case 'access_denied':
          return {
            success: false,
            error: 'access_denied',
            errorDescription: 'Autorización denegada por el usuario.',
          };

        default:
          return {
            success: false,
            error: errorBody.error,
            errorDescription: errorBody.error_description,
          };
      }
    }

    // Timeout
    return {
      success: false,
      error: 'expired_token',
      errorDescription: 'Tiempo de espera agotado. El código expiró.',
    };
  }

  /**
   * Convenience: run the full device flow in one call.
   * Returns the token response on success, or the error on failure.
   */
  async authorize(options?: {
    onCode?: (code: DeviceCodeResponse) => void;
    onPoll?: (attempt: number) => void;
  }): Promise<DeviceFlowResult> {
    const codeResponse = await this.requestDeviceCode();
    options?.onCode?.(codeResponse);
    return this.pollForToken(codeResponse.device_code, options?.onPoll);
  }
}

/** Custom error for device flow failures */
export class DeviceFlowError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'DeviceFlowError';
  }
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
