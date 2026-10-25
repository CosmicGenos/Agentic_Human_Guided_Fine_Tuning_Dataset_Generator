import { isAxiosError } from 'axios';

/**
 * Every failed request is normalised to this. The backend answers with
 *   { error: { code, message } }          our own errors
 *   { detail: string }                    FastAPI (e.g. "Not authenticated")
 *   { detail: [{ loc, msg, ... }] }       FastAPI request validation (422)
 * See docs/api.md §2 and §9.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  /** Per-field messages for 422 shape errors, keyed by the last `loc` segment. */
  readonly fields: Record<string, string>;

  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string };
  detail?: string | { loc?: (string | number)[]; msg?: string }[];
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  if (isAxiosError<ErrorEnvelope>(err)) {
    if (!err.response) {
      return new ApiError(0, 'network_error', 'Cannot reach the server. Check your connection and try again.');
    }
    const { status, data } = err.response;

    if (data?.error?.message) {
      return new ApiError(status, data.error.code ?? 'error', data.error.message);
    }
    if (typeof data?.detail === 'string') {
      return new ApiError(status, status === 401 ? 'not_authenticated' : 'error', data.detail);
    }
    if (Array.isArray(data?.detail)) {
      const fields: Record<string, string> = {};
      for (const item of data.detail) {
        const key = String(item.loc?.[item.loc.length - 1] ?? 'body');
        fields[key] ??= item.msg ?? 'Invalid value';
      }
      const first = Object.values(fields)[0] ?? 'The request was not valid.';
      return new ApiError(status, 'validation_error', first, fields);
    }
    return new ApiError(status, 'error', `Request failed (${status}).`);
  }

  return new ApiError(0, 'unknown', err instanceof Error ? err.message : 'Something went wrong.');
}
