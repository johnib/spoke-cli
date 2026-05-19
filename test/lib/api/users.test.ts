import nock from 'nock';
import { setupTmpHome, TmpHome } from '../../helpers/tmp-home';
import { disableRealNetwork, restoreNetwork, mockTokenEndpoint } from '../../helpers/nock-setup';
import { SpokeApiClient } from '../../../src/lib/api/client';
import { ActiveProfile } from '../../../src/lib/auth/profiles';
import * as users from '../../../src/lib/api/users';

const profile: ActiveProfile = {
  name: 'default',
  clientId: 'cid',
  clientSecret: 'sec',
  apiUrl: 'https://integration.spokephone.com',
  authUrl: 'https://auth.spokephone.com/oauth/token',
  ephemeral: false,
};

describe('api/users', () => {
  let tmp: TmpHome;
  beforeAll(() => disableRealNetwork());
  afterAll(() => restoreNetwork());
  beforeEach(() => {
    tmp = setupTmpHome();
    nock.cleanAll();
  });
  afterEach(() => tmp.cleanup());

  it('list returns users from .users / .entries / array', async () => {
    mockTokenEndpoint({ persistent: true });
    nock('https://integration.spokephone.com').get('/users').reply(200, [
      { id: 'u1', displayName: 'Alice', available: true },
      { id: 'u2', displayName: 'Bob', available: false },
    ]);
    const c = new SpokeApiClient({ active: profile });
    expect(await users.list(c)).toHaveLength(2);
  });

  it('list filters available users', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/users').reply(200, {
      users: [
        { id: 'u1', available: true },
        { id: 'u2', available: false },
      ],
    });
    const c = new SpokeApiClient({ active: profile });
    expect(await users.list(c, { available: true })).toHaveLength(1);
  });

  it('list passes email filter through as query', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/users')
      .query({ email: 'a@b.com' })
      .reply(200, [{ id: 'u1', email: 'a@b.com' }]);
    const c = new SpokeApiClient({ active: profile });
    expect(await users.list(c, { email: 'a@b.com' })).toHaveLength(1);
  });

  it('get by id', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/users/101').reply(200, { id: 'u1', extension: '101' });
    const c = new SpokeApiClient({ active: profile });
    expect((await users.get(c, '101')).extension).toBe('101');
  });

  it('get by email lists+filters', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/users')
      .query({ email: 'a@b.com' })
      .reply(200, [{ id: 'u1', email: 'a@b.com' }]);
    const c = new SpokeApiClient({ active: profile });
    expect((await users.get(c, 'a@b.com')).id).toBe('u1');
  });

  it('me hits /users/me', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/users/me').reply(200, { id: 'self' });
    const c = new SpokeApiClient({ active: profile });
    expect((await users.me(c)).id).toBe('self');
  });

  it('availability derives boolean from user status', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/users/101').reply(200, {
      id: 'u', extension: '101', status: 'available', available: true,
    });
    const c = new SpokeApiClient({ active: profile });
    const a = await users.availability(c, '101');
    expect(a.available).toBe(true);
    expect(a.status).toBe('available');
  });

  it('setAvailability PATCHes /users/{id}', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').patch('/users/101', { status: 'busy' }).reply(200, {
      id: 'u', status: 'busy',
    });
    const c = new SpokeApiClient({ active: profile });
    const out = await users.setAvailability(c, '101', 'busy');
    expect(out.status).toBe('busy');
  });

  it('redirectUrl includes ext + optional returnTo', () => {
    expect(users.redirectUrl('101')).toContain('ext=101');
    expect(users.redirectUrl('101', 'https://x')).toContain('returnTo=https');
  });
});
