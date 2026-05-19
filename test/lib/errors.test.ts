import {
  SpokeError,
  AuthError,
  NotFoundError,
  PermissionError,
  RateLimitError,
  ApiError,
  ValidationError,
  fromHttpStatus,
} from '../../src/lib/errors';

describe('errors', () => {
  it('SpokeError carries an exit code and hint', () => {
    const e = new SpokeError('boom', 1, 'try again');
    expect(e.exitCode).toBe(1);
    expect(e.hint).toBe('try again');
    expect(e.name).toBe('SpokeError');
  });

  it('typed subclasses set correct exit codes', () => {
    expect(new AuthError().exitCode).toBe(2);
    expect(new NotFoundError().exitCode).toBe(3);
    expect(new PermissionError().exitCode).toBe(4);
    expect(new RateLimitError().exitCode).toBe(5);
    expect(new ApiError('x', 500).exitCode).toBe(6);
    expect(new ApiError('x', 400).exitCode).toBe(1);
    expect(new ValidationError('bad').exitCode).toBe(1);
  });

  it.each([
    [401, AuthError],
    [403, PermissionError],
    [404, NotFoundError],
    [429, RateLimitError],
    [400, ApiError],
    [500, ApiError],
  ])('fromHttpStatus(%i) returns %p', (status, ctor) => {
    expect(fromHttpStatus(status, { message: 'x' })).toBeInstanceOf(ctor);
  });

  it('fromHttpStatus picks string body as message', () => {
    const e = fromHttpStatus(404, 'no such thing');
    expect(e.message).toBe('no such thing');
  });
});
