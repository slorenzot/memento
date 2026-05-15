// ─── OAuth 2.0 Device Flow Types (RFC 8628) ─────────────────

/** Configuration for the OAuth device flow client */
export interface OAuthClientConfig {
  /** Base URL of the memento-web server (e.g. 'https://memento-web.app') */
  serverUrl: string;
  /** OAuth client identifier */
  clientId?: string;
  /** Polling interval in seconds (server may override via slow_down) */
  pollInterval?: number;
  /** Device code lifetime in seconds (default: 900 = 15 min) */
  deviceCodeLifetime?: number;
  /** Custom fetch function — useful for testing with mocks */
  fetchFunction?: FetchFunction;
  /** Custom sleep function — useful for testing (default: real setTimeout) */
  sleepFunction?: SleepFunction;
}

/** Response from POST /api/oauth/device — RFC 8628 §3.1 */
export interface DeviceCodeResponse {
  /** The device verification code */
  device_code: string;
  /** The code the user should enter at the verification URI */
  user_code: string;
  /** The URI where the user should go to authorize */
  verification_uri: string;
  /** Full URI with user_code pre-embedded (optional convenience) */
  verification_uri_complete?: string;
  /** Lifetime in seconds of the device_code */
  expires_in: number;
  /** Minimum polling interval in seconds */
  interval: number;
}

/** Response from POST /api/v1/auth/device/token */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  /** Seconds until expiry (optional — device flow tokens may not expire) */
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  /** User info included in token response */
  user?: TokenUserInfo;
}

/** User info returned with the token */
export interface TokenUserInfo {
  email: string;
  name?: string;
  image?: string;
}

/** Error response from the token endpoint — RFC 8628 §3.5 */
export interface TokenErrorResponse {
  error: DeviceFlowError;
  error_description?: string;
}

/** RFC 8628 error codes */
export type DeviceFlowError =
  | 'authorization_pending'  // User hasn't authorized yet — keep polling
  | 'slow_down'              // Polling too fast — increase interval by 5s
  | 'expired_token'          // device_code expired — restart flow
  | 'access_denied'          // User denied authorization
  | 'invalid_client'         // Client authentication failed
  | 'invalid_grant'          // Code is invalid or expired
  | 'server_error';          // Internal server error

/** Stored auth token with metadata */
export interface StoredAuth {
  /** The access token */
  accessToken: string;
  /** Refresh token (for renewing access) */
  refreshToken?: string;
  /** Token type (always 'Bearer') */
  tokenType: 'Bearer';
  /** Absolute expiry timestamp (ms since epoch) */
  expiresAt: number;
  /** User info at time of auth */
  user?: TokenUserInfo;
  /** Server URL that issued this token */
  serverUrl: string;
  /** When this auth was stored */
  storedAt: number;
}

/** Result of a device flow authorization attempt */
export interface DeviceFlowResult {
  success: boolean;
  token?: TokenResponse;
  error?: DeviceFlowError;
  errorDescription?: string;
}

/** Configurable fetch function — allows mocking in tests */
export type FetchFunction = typeof fetch;

/** Configurable sleep function — allows mocking in tests (default: real setTimeout) */
export type SleepFunction = (ms: number) => Promise<void>;
