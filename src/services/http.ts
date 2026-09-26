/**
 * Backend API mijozi.
 * - Cookie'lar (HttpOnly access/refresh tokenlar) brauzer tomonidan avtomatik yuboriladi;
 *   JavaScript ularni ko'ra olmaydi (XSS bo'lsa ham tokenni o'g'irlab bo'lmaydi).
 * - O'zgartiruvchi so'rovlarga CSRF token (double-submit) qo'shiladi.
 * - Access token muddati tugasa — bir marta jimgina yangilanadi va so'rov qaytariladi.
 */
export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public code: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(code);
  }
}

const CSRF_COOKIES = ['__Host-csrf', 'csrf'];

function readCsrf(): string | null {
  const pairs = document.cookie.split(';').map((p) => p.trim().split('='));
  for (const name of CSRF_COOKIES) {
    const found = pairs.find(([k]) => k === name);
    if (found?.[1]) return decodeURIComponent(found[1]);
  }
  return null;
}

let csrfPromise: Promise<void> | null = null;
async function ensureCsrf(force = false): Promise<void> {
  if (!force && readCsrf()) return;
  csrfPromise ??= fetch('/api/auth/csrf', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => {
      csrfPromise = null;
    });
  await csrfPromise;
}

let refreshPromise: Promise<boolean> | null = null;
/** Parallel so'rovlar bitta refresh chaqiruvini baham ko'radi */
export function refreshSession(): Promise<boolean> {
  refreshPromise ??= request<{ user: unknown }>('/api/auth/refresh', { method: 'POST', retry: false })
    .then((r) => r.user !== null)
    .catch(() => false)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  raw?: Blob | ArrayBuffer;
  retry?: boolean;
  signal?: AbortSignal;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const method = opts.method ?? 'GET';
  const unsafe = method !== 'GET';
  if (unsafe) await ensureCsrf();
  const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers };
  if (unsafe) {
    headers['X-CSRF-Token'] = readCsrf() ?? '';
    if (!opts.raw) headers['Content-Type'] = 'application/json';
  }

  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers,
      credentials: 'same-origin',
      signal: opts.signal,
      body: opts.raw ?? (unsafe ? JSON.stringify(opts.body ?? {}) : undefined),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiRequestError(0, 'err.network');
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (res.ok) return data as T;

  const error = (data as { error?: { code?: string } & Record<string, unknown> } | null)?.error;
  const code = typeof error?.code === 'string' ? error.code : res.status >= 500 ? 'err.server' : 'err.validation';

  if (opts.retry !== false) {
    if (res.status === 401 && code === 'err.unauthorized' && (await refreshSession())) {
      return request<T>(path, { ...opts, retry: false });
    }
    if (res.status === 403 && code === 'err.csrf') {
      await ensureCsrf(true);
      return request<T>(path, { ...opts, retry: false });
    }
  }
  throw new ApiRequestError(res.status, code, error ?? {});
}

export const http = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) => request<T>(path, { method: 'POST', body, headers }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, file: Blob) => request<T>(path, { method: 'POST', raw: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } }),
};
