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

  it('list reads from { meta, users } envelope', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/users').reply(200, {
      meta: {},
      users: [
        { id: 'u1', extension: '101', displayName: 'Alice', email: 'a@x', availability: { status: 'available' } },
        { id: 'u2', extension: '102', displayName: 'Bob', availability: { status: 'busy' } },
      ],
    });
    const c = new SpokeApiClient({ active: profile });
    expect(await users.list(c)).toHaveLength(2);
  });

  it('list filters by availability', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/users').reply(200, {
      meta: {},
      users: [
        { id: 'u1', availability: { status: 'available' } },
        { id: 'u2', availability: { status: 'busy' } },
      ],
    });
    const c = new SpokeApiClient({ active: profile });
    expect(await users.list(c, { available: true })).toHaveLength(1);
  });

  it('list passes ?email= filter through', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/users')
      .query({ email: 'a@x' })
      .reply(200, { meta: {}, users: [{ id: 'u1', email: 'a@x' }] });
    const c = new SpokeApiClient({ active: profile });
    expect(await users.list(c, { email: 'a@x' })).toHaveLength(1);
  });

  it('get by email lists + takes first', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/users')
      .query({ email: 'a@x' })
      .reply(200, { meta: {}, users: [{ id: 'u1', email: 'a@x' }] });
    const c = new SpokeApiClient({ active: profile });
    expect((await users.get(c, 'a@x')).id).toBe('u1');
  });

  it('get by email throws when none match', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/users').query({ email: 'nope@x' }).reply(200, { meta: {}, users: [] });
    const c = new SpokeApiClient({ active: profile });
    await expect(users.get(c, 'nope@x')).rejects.toThrow(/no user with email/);
  });

  it('get by UUID hits /users/{uuid}', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/users/8cbb9b90-3a86-11f1-9f00-5f8007bb0e93')
      .reply(200, { id: '8cbb9b90-3a86-11f1-9f00-5f8007bb0e93', displayName: 'Abby' });
    const c = new SpokeApiClient({ active: profile });
    expect((await users.get(c, '8cbb9b90-3a86-11f1-9f00-5f8007bb0e93')).displayName).toBe('Abby');
  });

  it('get by extension resolves via /directory?extension=', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/directory')
      .query({ extension: '1053' })
      .reply(200, { meta: {}, entries: [{ id: 'u1', extension: '1053', displayName: 'Abby', type: 'user' }] });
    const c = new SpokeApiClient({ active: profile });
    expect((await users.get(c, '1053')).extension).toBe('1053');
  });

  it('get by extension throws when entry is not a user', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/directory')
      .query({ extension: '200' })
      .reply(200, { meta: {}, entries: [{ id: 't1', extension: '200', type: 'team', displayName: 'Sales' }] });
    const c = new SpokeApiClient({ active: profile });
    await expect(users.get(c, '200')).rejects.toThrow(/is a team, not a user/);
  });

  it('me hits /users/me', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/users/me').reply(200, { id: 'self' });
    const c = new SpokeApiClient({ active: profile });
    expect((await users.me(c)).id).toBe('self');
  });

  it('availability returns unknown when no availability field present', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/users/8cbb9b90-3a86-11f1-9f00-5f8007bb0e93')
      .reply(200, { id: '8cbb9b90-3a86-11f1-9f00-5f8007bb0e93' });
    const c = new SpokeApiClient({ active: profile });
    const a = await users.availability(c, '8cbb9b90-3a86-11f1-9f00-5f8007bb0e93');
    expect(a.available).toBe(false);
    expect(a.status).toBe('unknown');
  });

  it('availability extracts status from .availability', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/users/8cbb9b90-3a86-11f1-9f00-5f8007bb0e93')
      .reply(200, {
        id: '8cbb9b90-3a86-11f1-9f00-5f8007bb0e93',
        availability: { status: 'available', availabilitySummary: 'Available' },
      });
    const c = new SpokeApiClient({ active: profile });
    const a = await users.availability(c, '8cbb9b90-3a86-11f1-9f00-5f8007bb0e93');
    expect(a.available).toBe(true);
    expect(a.summary).toBe('Available');
  });
});
