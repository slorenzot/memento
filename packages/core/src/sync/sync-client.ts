import type {
  SyncPullResponse,
  SyncPushRequest,
  SyncPushResponse,
  SyncStatusResponse,
} from './types.js';
import { SyncApiError } from './types.js';

/**
 * HTTP client for the Memento v1 Sync API.
 *
 * Communicates with memento-web server at /api/v1/sync/*
 * Authentication via Bearer token from DeviceFlowClient.
 */
export class SyncClient {
  private baseUrl: string;
  private getToken: () => Promise<string | null>;
  private fetchFn: typeof fetch;

  constructor(options: {
    serverUrl: string;
    getToken: () => Promise<string | null>;
    fetchFunction?: typeof fetch;
  }) {
    this.baseUrl = options.serverUrl.replace(/\/+$/, '');
    this.getToken = options.getToken;
    this.fetchFn = options.fetchFunction || fetch;
  }

  /**
   * Pull changes from server since cursor.
   * GET /api/v1/sync/pull?projectId=<slug>&cursor=<iso>&limit=<n>
   */
  async pull(params: { projectId: string; cursor: string | null; limit?: number }): Promise<SyncPullResponse> {
    const qp = new URLSearchParams({ projectId: params.projectId });
    if (params.cursor) qp.set('cursor', params.cursor);
    if (params.limit) qp.set('limit', String(params.limit));

    const response = await this.request<{ success: boolean; data: SyncPullResponse }>(
      'GET',
      `/api/v1/sync/pull?${qp.toString()}`,
    );

    return response.data;
  }

  /**
   * Push local mementos to server.
   * POST /api/v1/sync/push
   */
  async push(data: SyncPushRequest): Promise<SyncPushResponse> {
    const response = await this.request<{ success: boolean; data: SyncPushResponse }>(
      'POST',
      '/api/v1/sync/push',
      data,
    );

    return response.data;
  }

  /**
   * Get sync status for a project.
   * GET /api/v1/sync/status?projectId=<slug>
   */
  async status(projectId: string): Promise<SyncStatusResponse> {
    const response = await this.request<{ success: boolean; data: SyncStatusResponse }>(
      'GET',
      `/api/v1/sync/status?projectId=${encodeURIComponent(projectId)}`,
    );

    return response.data;
  }

  /**
   * Make an authenticated request to the sync API.
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const token = await this.getToken();

    if (!token) {
      throw new SyncApiError(
        'Not authenticated. Run `memento login` first.',
        401,
        'UNAUTHORIZED',
      );
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401) {
      throw new SyncApiError(
        'Authentication failed. Run `memento login` again.',
        401,
        'UNAUTHORIZED',
      );
    }

    if (response.status === 403) {
      throw new SyncApiError(
        'Access denied. Check your project permissions.',
        403,
        'FORBIDDEN',
      );
    }

    if (response.status === 429) {
      throw new SyncApiError(
        'Rate limited. Please wait before retrying.',
        429,
        'RATE_LIMITED',
      );
    }

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');

      // Try to extract a more specific error message from the response body.
      // The memento-hub API returns { error: { code, message } } for validation errors.
      let detail = '';
      try {
        const parsed = JSON.parse(text);
        if (parsed?.error?.message) {
          detail = ` — ${parsed.error.message}`;
        } else if (parsed?.message) {
          detail = ` — ${parsed.message}`;
        }
      } catch {
        // Not JSON — use raw text if it's short enough
        if (text && text.length < 500) {
          detail = ` — ${text}`;
        }
      }

      throw new SyncApiError(
        `Sync API error: ${response.status} ${response.statusText}${detail}`,
        response.status,
        undefined,
        text,
      );
    }

    return response.json() as Promise<T>;
  }
}
