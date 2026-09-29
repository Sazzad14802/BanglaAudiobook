/**
 * Centralized HTTP client for the Platform API.
 *
 * All API calls should go through this client so that:
 * - The base URL is configured in one place (src/config.ts)
 * - The auth token is attached to every authenticated request
 * - HTTP errors are handled consistently
 */

import { API_V1 } from '../config';
import { authStorage } from '../storage/authStorage';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(detail);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

async function getHeaders(authenticated = true): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (authenticated) {
    const token = await authStorage.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    // 204 No Content
    if (response.status === 204) {
      return undefined as unknown as T;
    }
    return response.json() as Promise<T>;
  }

  let detail = `HTTP ${response.status}`;
  try {
    const body = await response.json();
    detail = body?.detail ?? body?.message ?? detail;
    // FastAPI validation errors return an array
    if (Array.isArray(detail)) {
      detail = detail.map((e: { msg: string }) => e.msg).join(', ');
    }
  } catch {
    // ignore json parse error
  }

  throw new ApiError(response.status, detail);
}

export const apiClient = {
  async get<T>(path: string, authenticated = true): Promise<T> {
    const headers = await getHeaders(authenticated);
    const response = await fetch(`${API_V1}${path}`, { method: 'GET', headers });
    return handleResponse<T>(response);
  },

  async post<T>(path: string, body?: unknown, authenticated = true): Promise<T> {
    const headers = await getHeaders(authenticated);
    const response = await fetch(`${API_V1}${path}`, {
      method: 'POST',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async patch<T>(path: string, body?: unknown, authenticated = true): Promise<T> {
    const headers = await getHeaders(authenticated);
    const response = await fetch(`${API_V1}${path}`, {
      method: 'PATCH',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async put<T>(path: string, body?: unknown, authenticated = true): Promise<T> {
    const headers = await getHeaders(authenticated);
    const response = await fetch(`${API_V1}${path}`, {
      method: 'PUT',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async delete<T>(path: string, authenticated = true): Promise<T> {
    const headers = await getHeaders(authenticated);
    const response = await fetch(`${API_V1}${path}`, { method: 'DELETE', headers });
    return handleResponse<T>(response);
  },

  /**
   * Upload a file using multipart/form-data.
   * The Content-Type header must NOT be set manually (browser sets it with boundary).
   */
  async uploadFile<T>(path: string, formData: FormData, authenticated = true): Promise<T> {
    const token = authenticated ? await authStorage.getToken() : null;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    try {
      const response = await fetch(`${API_V1}${path}`, {
        method: 'POST',
        headers,
        body: formData,
      });
      return await handleResponse<T>(response);
    } catch (err) {
      if (err instanceof ApiError) {
        throw err;
      }
      const message = (err as Error)?.message || 'Network request failed';
      throw new ApiError(0, `Upload network error: ${message}. Server at ${API_V1}`);
    }
  },
};
