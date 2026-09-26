/**
 * API xatolari. `code` — frontend i18n kaliti (masalan, 'auth.invalid').
 * Foydalanuvchiga hech qachon stack trace yoki ichki xato matni yuborilmaydi.
 */
export class ApiError extends Error {
  constructor(
    public status: 400 | 401 | 403 | 404 | 409 | 413 | 415 | 422 | 429 | 500 | 503,
    public code: string,
    public extra?: Record<string, unknown>,
  ) {
    super(code);
  }
}

export const badRequest = (code = 'err.validation', extra?: Record<string, unknown>) => new ApiError(400, code, extra);
export const unauthorized = (code = 'err.unauthorized') => new ApiError(401, code);
export const forbidden = (code = 'err.forbidden') => new ApiError(403, code);
export const notFound = (code = 'err.notFound') => new ApiError(404, code);
export const conflict = (code: string) => new ApiError(409, code);
export const tooMany = (retryAfterSec: number, code = 'v.tooMany') => new ApiError(429, code, { retryAfter: retryAfterSec });
