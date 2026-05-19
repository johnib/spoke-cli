import nock from 'nock';
import { setupTmpHome, TmpHome } from '../../helpers/tmp-home';
import { disableRealNetwork, restoreNetwork, mockTokenEndpoint, mockTokenEndpointFailure, FAKE_TOKEN } from '../../helpers/nock-setup';
import { fetchToken, getToken, invalidateToken } from '../../../src/lib/auth/oauth';
import { ActiveProfile } from '../../../src/lib/auth/profiles';
import { AuthError } from '../../../src/lib/errors';
import { readToken, writeToken } from '../../../src/lib/auth/token-cache';

function makeProfile(overrides: Partial<ActiveProfile> = {}): ActiveProfile {
  return {
    name: 'default',
    clientId: 'cid',
    clientSecret: 'sec',
    apiUrl: 'https://integration.spokephone.com',
    authUrl: 'https://auth.spokephone.com/oauth/token',
    ephemeral: false,
    ...overrides,
  };
}

describe('auth/oauth', () => {
  let tmp: TmpHome;
  beforeAll(() => disableRealNetwork());
  afterAll(() => restoreNetwork());
  beforeEach(() => {
    tmp = setupTmpHome();
    nock.cleanAll();
  });
  afterEach(() => tmp.cleanup());

  it('fetches a token via client_credentials', async () => {
    mockTokenEndpoint();
    const tok = await fetchToken(makeProfile());
    expect(tok.access_token).toBe(FAKE_TOKEN);
    expect(tok.expires_at).toBeGreaterThan(Date.now());
  });

  it('throws AuthError on 401 from token endpoint', async () => {
    mockTokenEndpointFailure(401);
    await expect(fetchToken(makeProfile())).rejects.toBeInstanceOf(AuthError);
  });

  it('throws AuthError on a network error', async () => {
    // No nock interceptor; net connect disabled so axios fails.
    await expect(fetchToken(makeProfile())).rejects.toBeInstanceOf(AuthError);
  });

  it('throws AuthError when response has no access_token', async () => {
    nock('https://auth.spokephone.com').post('/oauth/token').reply(200, {});
    await expect(fetchToken(makeProfile())).rejects.toBeInstanceOf(AuthError);
  });

  it('getToken caches token on first fetch', async () => {
    mockTokenEndpoint();
    const t1 = await getToken(makeProfile());
    expect(t1).toBe(FAKE_TOKEN);
    expect(readToken('default')?.access_token).toBe(FAKE_TOKEN);
  });

  it('getToken returns cached token when not expired', async () => {
    writeToken('default', {
      access_token: 'cached',
      token_type: 'Bearer',
      expires_at: Date.now() + 600_000,
    });
    // No mock — if it tries to fetch, the test would fail because net is disabled.
    const t = await getToken(makeProfile());
    expect(t).toBe('cached');
  });

  it('getToken refreshes when token is expired', async () => {
    writeToken('default', {
      access_token: 'stale',
      token_type: 'Bearer',
      expires_at: Date.now() - 1000,
    });
    mockTokenEndpoint({ token: 'fresh' });
    const t = await getToken(makeProfile());
    expect(t).toBe('fresh');
  });

  it('getToken honours forceRefresh', async () => {
    writeToken('default', {
      access_token: 'cached',
      token_type: 'Bearer',
      expires_at: Date.now() + 600_000,
    });
    mockTokenEndpoint({ token: 'forced' });
    const t = await getToken(makeProfile(), true);
    expect(t).toBe('forced');
  });

  it('getToken does NOT persist for ephemeral profiles', async () => {
    mockTokenEndpoint({ token: 'ephem' });
    await getToken(makeProfile({ ephemeral: true }));
    expect(readToken('default')).toBeNull();
  });

  it('invalidateToken clears the cached token', async () => {
    writeToken('default', { access_token: 'x', token_type: 'Bearer', expires_at: Date.now() + 1e6 });
    invalidateToken(makeProfile());
    expect(readToken('default')).toBeNull();
  });
});
