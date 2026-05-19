import nock from 'nock';

export const DEFAULT_API_URL = 'https://integration.spokephone.com';
export const DEFAULT_AUTH_URL_HOST = 'https://auth.spokephone.com';
export const DEFAULT_AUTH_URL_PATH = '/oauth/token';

export const FAKE_TOKEN = 'test-access-token-abc123';

/**
 * Stand up a fake OAuth token endpoint that returns a fresh bearer token for
 * the duration of one request. Returns the underlying nock interceptor so the
 * caller can assert it was hit.
 */
export function mockTokenEndpoint(opts?: { token?: string; expiresIn?: number; persistent?: boolean }) {
  const token = opts?.token ?? FAKE_TOKEN;
  const expiresIn = opts?.expiresIn ?? 3600;
  const scope = nock(DEFAULT_AUTH_URL_HOST).post(DEFAULT_AUTH_URL_PATH);
  const interceptor = scope.reply(200, {
    access_token: token,
    token_type: 'Bearer',
    expires_in: expiresIn,
  });
  if (opts?.persistent) interceptor.persist();
  return interceptor;
}

export function mockTokenEndpointFailure(status = 401, body: any = { error: 'invalid_client' }) {
  return nock(DEFAULT_AUTH_URL_HOST).post(DEFAULT_AUTH_URL_PATH).reply(status, body);
}

export function disableRealNetwork(): void {
  nock.disableNetConnect();
}

export function restoreNetwork(): void {
  nock.enableNetConnect();
  nock.cleanAll();
}
