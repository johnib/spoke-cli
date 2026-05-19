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

  it('normalizeType maps "group" to "callGroup"', () => {
    expect(directory.normalizeType('group')).toBe('callGroup');
    expect(directory.normalizeType('user')).toBe('user');
    expect(directory.normalizeType(undefined)).toBeUndefined();
  });

  it('list returns the entries array', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/directory')
      .reply(200, {
        entries: [
          { extension: '101', displayName: 'Alice', type: 'user', available: true },
          { extension: '200', displayName: 'Sales', type: 'callGroup' },
        ],
      });
    const c = new SpokeApiClient({ active: profile });
    const arr = await directory.list(c);
    expect(arr).toHaveLength(2);
  });

  it('list filters by type', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').reply(200, {
      entries: [
        { extension: '101', type: 'user' },
        { extension: '200', type: 'callGroup' },
      ],
    });
    const c = new SpokeApiClient({ active: profile });
    const groups = await directory.list(c, { type: 'group' });
    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe('callGroup');
  });

  it('list filters by available', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').reply(200, [
      { extension: '101', type: 'user', available: true },
      { extension: '102', type: 'user', available: false },
    ]);
    const c = new SpokeApiClient({ active: profile });
    const out = await directory.list(c, { available: true });
    expect(out).toHaveLength(1);
  });

  it('list hides hidden entries by default', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').reply(200, [
      { extension: '101', type: 'user', hidden: true },
      { extension: '102', type: 'user', hidden: false },
    ]);
    const c = new SpokeApiClient({ active: profile });
    const out = await directory.list(c);
    expect(out).toHaveLength(1);
  });

  it('list includes hidden entries when requested', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/directory')
      .query({ includeHiddenCallGroups: 'true' })
      .reply(200, [
        { extension: '101', type: 'user', hidden: true },
      ]);
    const c = new SpokeApiClient({ active: profile });
    const out = await directory.list(c, { hidden: true });
    expect(out).toHaveLength(1);
  });

  it('get fetches numeric id directly', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory/101').reply(200, {
      extension: '101',
      displayName: 'Alice',
    });
    const c = new SpokeApiClient({ active: profile });
    const e = await directory.get(c, '101');
    expect(e.displayName).toBe('Alice');
  });

  it('get does fuzzy name match when given a string id', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').reply(200, [
      { extension: '200', displayName: 'Sales Team', type: 'callGroup' },
    ]);
    const c = new SpokeApiClient({ active: profile });
    const e = await directory.get(c, 'sales');
    expect(e.displayName).toBe('Sales Team');
  });

  it('search matches name, extension, or id', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').reply(200, [
      { extension: '101', displayName: 'Alice', type: 'user' },
      { extension: '102', displayName: 'Bob', type: 'user' },
    ]);
    const c = new SpokeApiClient({ active: profile });
    expect((await directory.search(c, 'alice')).map((e) => e.displayName)).toEqual(['Alice']);
  });
});
