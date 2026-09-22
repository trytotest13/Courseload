export interface ApiErrorBody {
  error: {
    message: string;
    code: string;
    details?: Record<string, string>;
  };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, string>;

  constructor(status: number, message: string, code = 'error', details: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const TOKEN_KEY = 'courseload.token';

/**
 * The API lives on a different origin once deployed, so the token travels in the
 * Authorization header rather than a cookie. Trade off noted in the README: a
 * cookie would be safer against script injection, a header is simpler across hosts.
 */
export const tokenStore = {
  get(): string | null {
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string): void {
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* private mode, the session simply will not survive a reload */
    }
  },
  clear(): void {
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* nothing to clean up */
    }
  },
};

const baseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  if (options.auth !== false) {
    const token = tokenStore.get();
    if (token) headers.Authorization = 'Bearer ' + token;
  }

  let response: Response;
  try {
    response = await fetch(baseUrl + path, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch {
    throw new ApiError(0, 'We could not reach the server. Check your connection and try again.', 'offline');
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const body = payload as ApiErrorBody | null;
    throw new ApiError(
      response.status,
      body?.error?.message ?? 'Something went wrong. Try again.',
      body?.error?.code ?? 'error',
      body?.error?.details ?? {},
    );
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
