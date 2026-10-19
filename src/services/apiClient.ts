/**
 * API Client for Java 17 REST API
 * Handles HTTP communication with the Java backend (default: http://localhost:8080/api/v1)
 * Includes timeout handling, error normalization, and health checks.
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface BackendHealth {
  status: 'UP' | 'DOWN' | 'UNKNOWN';
  version?: string;
  database?: 'CONNECTED' | 'DISCONNECTED';
  uptimeSeconds?: number;
  message?: string;
}

class ApiClient {
  private baseUrl: string;
  private timeoutMs: number;

  constructor(baseUrl = 'http://localhost:8080/api/v1', timeoutMs = 4000) {
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  /**
   * Health check to probe the Java REST API server.
   */
  public async checkHealth(): Promise<BackendHealth> {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), this.timeoutMs);

      const res = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(id);

      if (!res.ok) {
        return {
          status: 'DOWN',
          message: `Server returned HTTP ${res.status}: ${res.statusText}`,
        };
      }

      const json = await res.json();
      return {
        status: json.status === 'UP' ? 'UP' : 'DOWN',
        version: json.version || '1.0.0-Java17',
        database: json.database || 'DISCONNECTED',
        uptimeSeconds: json.uptimeSeconds || 0,
        message: json.message || 'Java 17 REST Service Operational',
      };
    } catch (err: any) {
      return {
        status: 'DOWN',
        message: err.name === 'AbortError'
          ? 'Connection timed out (Java server offline)'
          : 'Could not connect to Java REST API at ' + this.baseUrl,
      };
    }
  }

  /**
   * Generic request wrapper with timeout and standard JSON serialization.
   */
  public async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(options.headers || {}),
        },
      });
      clearTimeout(timer);

      const contentType = response.headers.get('content-type');
      let data: any = null;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = text ? { message: text } : null;
      }

      if (!response.ok) {
        return {
          success: false,
          error: data?.error || data?.message || `HTTP ${response.status} ${response.statusText}`,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: true,
        data: (data?.data !== undefined ? data.data : data) as T,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      clearTimeout(timer);
      const isTimeout = err.name === 'AbortError';
      return {
        success: false,
        error: isTimeout
          ? `Request timeout after ${this.timeoutMs}ms`
          : err.message || 'Network connection failed',
        timestamp: new Date().toISOString(),
      };
    }
  }

  // --- Convenience HTTP Verbs ---
  public get<T>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }

  public post<T>(endpoint: string, body?: any, headers?: Record<string, string>) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers,
    });
  }

  public put<T>(endpoint: string, body?: any, headers?: Record<string, string>) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers,
    });
  }

  public patch<T>(endpoint: string, body?: any, headers?: Record<string, string>) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers,
    });
  }

  public delete<T>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }
}

export const apiClient = new ApiClient();
