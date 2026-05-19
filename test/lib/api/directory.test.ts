import nock from 'nock';
import { setupTmpHome, TmpHome } from '../../helpers/tmp-home';
import { disableRealNetwork, restoreNetwork, mockTokenEndpoint } from '../../helpers/nock-setup';
import { SpokeApiClient } from '../../../src/lib/api/client';
import { ActiveProfile } from '../../../src/lib/auth/profiles';
import * as directory from '../../../src/lib/api/directory';

const profile: ActiveProfile = {
  name: 'default',
  clientId: 'cid',
  clientSecret: 'sec',
  apiUrl: 'https://integration.spokephone.com',
  authUrl: 'https://auth.spokephone.com/oauth/token',
  ephemeral: false,
};

describe('api/directory', () => {
  let tmp: TmpHome;
  beforeAll(() => disableRealNetwork());
  afterAll(() => restoreNetwork());
  beforeEach(() => {
    tmp = setupTmpHome();
    nock.cleanAll();
  });
  afterEach(() => tmp.cleanup());

  it('normalizeType maps user-facing "group" to wire "team"', () => {
    expect(directory.normalizeType('group')).toBe('team');
    expect(directory.normalizeType('callGroup')).toBe('team');
    expect(directory.normalizeType('user')).toBe('user');
    expect(directory.normalizeType(undefined)).toBeUndefined();
  });

  it('list reads entries from { meta, entries } envelope', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').reply(200, {
      meta: { next: null },
      entries: [
        { id: 'u1', extension: '101', displayName: 'Alice', type: 'user', availability: { status: 'available' } },
        { id: 't1', extension: '200', displayName: 'Sales', type: 'team' },
      ],
    });
    const c = new SpokeApiClient({ active: profile });
    expect(await directory.list(c)).toHaveLength(2);
  });

  it('list filters by user-facing "group" → wire "team"', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').reply(200, {
      meta: {},
      entries: [
        { id: 'u1', extension: '101', type: 'user' },
        { id: 't1', extension: '200', type: 'team' },
      ],
    });
    const c = new SpokeApiClient({ active: profile });
    const groups = await directory.list(c, { type: 'group' });
    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe('team');
  });

  it('list filters by availability.status', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').reply(200, {
      meta: {},
      entries: [
        { id: 'u1', extension: '101', type: 'user', availability: { status: 'available' } },
        { id: 'u2', extension: '102', type: 'user', availability: { status: 'busy' } },
      ],
    });
    const c = new SpokeApiClient({ active: profile });
    expect(await directory.list(c, { available: true })).toHaveLength(1);
  });

  it('list hides isHidden entries by default', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').reply(200, {
      meta: {},
      entries: [
        { id: 'u1', extension: '101', type: 'user', isHidden: true },
        { id: 'u2', extension: '102', type: 'user', isHidden: false },
      ],
    });
    const c = new SpokeApiClient({ active: profile });
    expect(await directory.list(c)).toHaveLength(1);
  });

  it('list passes includeHiddenCallGroups when --hidden', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/directory')
      .query({ includeHiddenCallGroups: 'true' })
      .reply(200, { meta: {}, entries: [{ id: 't1', type: 'team', isHidden: true }] });
    const c = new SpokeApiClient({ active: profile });
    expect(await directory.list(c, { hidden: true, type: 'group' })).toHaveLength(1);
  });

  it('get by UUID hits /directory/{uuid}', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/directory/8cbb9b90-3a86-11f1-9f00-5f8007bb0e93')
      .reply(200, { id: '8cbb9b90-3a86-11f1-9f00-5f8007bb0e93', extension: '1053', displayName: 'Abby', type: 'user' });
    const c = new SpokeApiClient({ active: profile });
    expect((await directory.get(c, '8cbb9b90-3a86-11f1-9f00-5f8007bb0e93')).displayName).toBe('Abby');
  });

  it('get by extension uses /directory?extension=N', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/directory')
      .query({ extension: '101' })
      .reply(200, { meta: {}, entries: [{ id: 'u1', extension: '101', displayName: 'Alice', type: 'user' }] });
    const c = new SpokeApiClient({ active: profile });
    expect((await directory.get(c, '101')).displayName).toBe('Alice');
  });

  it('get by extension throws NotFoundError on empty result', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').query({ extension: '999' }).reply(200, { meta: {}, entries: [] });
    const c = new SpokeApiClient({ active: profile });
    await expect(directory.get(c, '999')).rejects.toThrow(/not found/);
  });

  it('get by name does fuzzy match', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').query({ limit: '1000' }).reply(200, {
      meta: {},
      entries: [{ id: 't1', extension: '200', displayName: 'Sales Team', type: 'team' }],
    });
    const c = new SpokeApiClient({ active: profile });
    expect((await directory.get(c, 'sales')).displayName).toBe('Sales Team');
  });

  it('search matches against name/extension/email', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').query({ limit: '1000' }).reply(200, {
      meta: {},
      entries: [
        { id: 'u1', extension: '101', displayName: 'Alice', email: 'a@x', type: 'user' },
        { id: 'u2', extension: '102', displayName: 'Bob', email: 'b@x', type: 'user' },
      ],
    });
    const c = new SpokeApiClient({ active: profile });
    expect((await directory.search(c, 'alice')).map((e) => e.displayName)).toEqual(['Alice']);
  });
});
