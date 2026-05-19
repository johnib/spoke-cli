export type ExitCode = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export class SpokeError extends Error {
  readonly exitCode: ExitCode;
  readonly hint?: string;

  constructor(message: string, exitCode: ExitCode = 1, hint?: string) {
    super(message);
    this.name = 'SpokeError';
    this.exitCode = exitCode;
    this.hint = hint;
  }
}

export class AuthError extends SpokeError {
  constructor(message = 'credentials invalid or expired', hint = 'Run `spoke auth login` to re-authenticate.') {
    super(message, 2, hint);
    this.name = 'AuthError';
  }
}

export class NotFoundError extends SpokeError {
  constructor(message = 'resource not found', hint?: string) {
    super(message, 3, hint);
    this.name = 'NotFoundError';
  }
}

export class PermissionError extends SpokeError {
  constructor(message = 'permission denied') {
    super(message, 4);
    this.name = 'PermissionError';
  }
}

export class RateLimitError extends SpokeError {
  constructor(message = 'rate limited', readonly retryAfter?: number) {
    super(message, 5);
    this.name = 'RateLimitError';
  }
}

export class ApiError extends SpokeError {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message, status >= 500 ? 6 : 1);
    this.name = 'ApiError';
  }
}

export class ValidationError extends SpokeError {
  constructor(message: string, hint?: string) {
    super(message, 1, hint);
    this.name = 'ValidationError';
  }
}

export function fromHttpStatus(status: number, body?: unknown): SpokeError {
  const bodyMsg = typeof body === 'string' ? body : (body as any)?.message;
  if (status === 401) return new AuthError(bodyMsg ?? 'unauthorized');
  if (status === 403) return new PermissionError(bodyMsg ?? 'forbidden');
  if (status === 404) return new NotFoundError(bodyMsg ?? 'not found');
  if (status === 429) return new RateLimitError(bodyMsg ?? 'rate limited');
  return new ApiError(bodyMsg ?? `HTTP ${status}`, status, body);
}
