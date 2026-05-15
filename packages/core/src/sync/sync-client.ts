import type {
  SyncPullResponse,
  SyncPushRequest,
  SyncPushResponse,
  SyncStatusResponse,
} from './types.js';
import { SyncApiError } from './types.js';

/**
 * HTTP client for the Memento sync API.
 *
 * Handles authentication via Bearer token, error handling,
 * and communication with the web-ui sync endpoints.
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
    // Strip trailing slash
    this.baseUrl = options.serverUrl.replace(/\/+$/, '');
    this.getToken = options.getToken;
    this.fetchFn = options.fetchFunction || fetch;
  }

  /**
   * Pull observations modified since a given timestamp.
   */
  async pull(since: number | null, projectId?: string): Promise<SyncPullResponse> {
    const params = new URLSearchParams();
    if (since !== null) {
      params.set('since', String(since));
    }
    if (projectId) {
      params.set('projectId', projectId);
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<SyncPullResponse>('GET', `/api/sync/pull${query}`);
  }

  /**
   * Push local observations to the server.
   */
  async push(data: SyncPushRequest): Promise<SyncPushResponse> {
    return this.request<SyncPushResponse>('POST', '/api/sync/push', data);
  }

  /**
   * Get sync status from the server.
   */
  async status(projectId?: string): Promise<SyncStatusResponse> {
    const params = new URLSearchParams();
    if (projectId) {
      params.set('projectId', projectId);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<SyncStatusResponse>('GET', `/api/sync/status${query}`);
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
        'Authentication failed. Your token may have expired. Run `memento login` again.',
        401,
      );
    }

    if (response.status === 403) {
      throw new SyncApiError(
        'Access denied. Check your permissions.',
        403,
      );
    }

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      throw new SyncApiError(
        `Sync API error: ${response.status} ${response.statusText}`,
        response.status,
        text,
      );
    }

    return response.json() as Promise<T>;
  }
}
