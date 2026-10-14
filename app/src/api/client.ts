/**
 * Centralized HTTP client for the Platform API.
 *
 * Design Pattern:
 * 1. Singleton Pattern: Single apiClient instance managing headers, auth token, and network calls.
 * 2. Failover Strategy & Chain of Responsibility: Automatically tries candidate API base URLs
 *    (Cloud Tunnel, LAN Wi-Fi IP, Emulator) with quick 6s fail-fast timeout to avoid infinite loading.
 * 3. Facade Pattern: Simple get/post/patch/put/delete methods hiding underlying fetch complexities.
 */

import {
  getActiveApiBaseUrl,
  getActiveApiV1,
  getApiBaseUrlCandidates,
  setActiveApiBaseUrl,
} from '../config';
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
    'bypass-tunnel-reminder': 'true',
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

// 6 seconds fail-fast timeout (never hang the UI for 30s)
const REQUEST_TIMEOUT_MS = 6_000;

async function singleFetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  console.log(`[HTTP Request] ${options.method || 'GET'} ${url}`);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    console.log(`[HTTP Response] ${response.status} ${url}`);
    return response;
  } catch (err: any) {
    console.warn(`[HTTP Error] ${url}:`, err?.message || err);
    if (
      err?.name === 'AbortError' ||
      err?.message?.includes('cancelled') ||
      err?.message?.includes('aborted')
    ) {
      throw new ApiError(
        0,
        `Connection timed out (${timeoutMs / 1000}s). Server at ${url} did not respond.`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Executes a request using the Failover Chain Strategy.
 * Tries the currently active base URL first. If a transport/network error occurs,
 * it tries remaining candidate URLs until one succeeds or all fail.
 */
async function executeWithFailover<T>(
  path: string,
  options: RequestInit,
): Promise<T> {
  const candidates = getApiBaseUrlCandidates();
  const currentActive = getActiveApiBaseUrl();

  // Order candidates starting with the current active URL
  const orderedCandidates = [
    currentActive,
    ...candidates.filter((c) => c !== currentActive),
  ];

  let lastError: any = null;

  for (let i = 0; i < orderedCandidates.length; i++) {
    const baseUrl = orderedCandidates[i];
    const fullUrl = `${baseUrl}/api/v1${path}`;

    try {
      const response = await singleFetchWithTimeout(fullUrl, options);
      // If we got an actual HTTP response from the server, it was reached!
      if (baseUrl !== currentActive) {
        setActiveApiBaseUrl(baseUrl);
      }
      return await handleResponse<T>(response);
    } catch (err: any) {
      lastError = err;
      // If error is an ApiError with a real HTTP status (> 0), the server was reached (e.g. 401, 404, 409).
      // Do NOT retry with other hosts for valid application errors!
      if (err instanceof ApiError && err.status > 0) {
        throw err;
      }
      console.warn(
        `[Failover] Base URL ${baseUrl} unreachable. Trying next candidate if available...`,
      );
    }
  }

  // All candidates failed
  if (lastError instanceof ApiError) {
    throw lastError;
  }
  const message = lastError?.message || 'Network request failed';
  throw new ApiError(
    0,
    `সার্ভারের সাথে সংযোগ করা যায়নি (${message})। Wi-Fi বা ইন্টারনেট কানেকশন নিশ্চিত করুন।`,
  );
}

export const apiClient = {
  async get<T>(path: string, authenticated = true): Promise<T> {
    const headers = await getHeaders(authenticated);
    return executeWithFailover<T>(path, { method: 'GET', headers });
  },

  async post<T>(path: string, body?: unknown, authenticated = true): Promise<T> {
    const headers = await getHeaders(authenticated);
    return executeWithFailover<T>(path, {
      method: 'POST',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  async patch<T>(path: string, body?: unknown, authenticated = true): Promise<T> {
    const headers = await getHeaders(authenticated);
    return executeWithFailover<T>(path, {
      method: 'PATCH',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  async put<T>(path: string, body?: unknown, authenticated = true): Promise<T> {
    const headers = await getHeaders(authenticated);
    return executeWithFailover<T>(path, {
      method: 'PUT',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  async delete<T>(path: string, authenticated = true): Promise<T> {
    const headers = await getHeaders(authenticated);
    return executeWithFailover<T>(path, { method: 'DELETE', headers });
  },

  /**
   * Upload a file using multipart/form-data via XMLHttpRequest.
   * Modern Expo fetch throws "Unsupported FormDataPart implementation" when encountering
   * native React Native file descriptors ({ uri, name, type }).
   * XMLHttpRequest delegates directly to native Android/iOS networking and avoids this bug.
   */
  async uploadFile<T>(path: string, formData: FormData, authenticated = true): Promise<T> {
    const token = authenticated ? await authStorage.getToken() : null;
    const candidates = getApiBaseUrlCandidates();
    const currentActive = getActiveApiBaseUrl();
    const orderedCandidates = [
      currentActive,
      ...candidates.filter((c) => c !== currentActive),
    ];

    let lastError: any = null;

    for (let i = 0; i < orderedCandidates.length; i++) {
      const baseUrl = orderedCandidates[i];
      const fullUrl = `${baseUrl}/api/v1${path}`;

      try {
        console.log(`[Upload Request] POST ${fullUrl}`);
        const result = await new Promise<T>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', fullUrl, true);
          xhr.timeout = 120000;
          xhr.setRequestHeader('Accept', 'application/json');
          xhr.setRequestHeader('bypass-tunnel-reminder', 'true');
          if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          }

          xhr.onload = () => {
            try {
              const text = xhr.responseText;
              const data = text ? JSON.parse(text) : {};
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve(data as T);
              } else {
                reject(new ApiError(xhr.status, data?.detail || `Upload failed (${xhr.status})`, data));
              }
            } catch {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve({} as T);
              } else {
                reject(new ApiError(xhr.status, `Upload failed with status ${xhr.status}`));
              }
            }
          };

          xhr.onerror = () => {
            reject(new ApiError(0, 'Network request failed'));
          };

          xhr.ontimeout = () => {
            reject(new ApiError(0, `Upload timed out. Server at ${baseUrl} did not respond.`));
          };

          xhr.send(formData);
        });

        if (baseUrl !== currentActive) {
          setActiveApiBaseUrl(baseUrl);
        }
        return result;
      } catch (err: any) {
        lastError = err;
        if (err instanceof ApiError && err.status > 0) {
          throw err;
        }
        console.warn(`[Failover] Upload base URL ${baseUrl} unreachable. Trying next candidate...`);
      }
    }

    if (lastError instanceof ApiError) {
      throw lastError;
    }
    const message = lastError?.message || 'Network request failed';
    throw new ApiError(
      0,
      `সার্ভারের সাথে সংযোগ করা যায়নি (${message})। Wi-Fi বা ইন্টারনেট কানেকশন নিশ্চিত করুন।`,
    );
  },
};
