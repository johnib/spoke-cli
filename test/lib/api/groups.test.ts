import nock from 'nock';
import { setupTmpHome, TmpHome } from '../../helpers/tmp-home';
import { disableRealNetwork, restoreNetwork, mockTokenEndpoint } from '../../helpers/nock-setup';
import { SpokeApiClient } from '../../../src/lib/api/client';
import { ActiveProfile } from '../../../src/lib/auth/profiles';
import * as groups from '../../../src/lib/api/groups';

const profile: ActiveProfile = {
  name: 'default',
  clientId: 'cid',
  clientSecret: 'sec',
  apiUrl: 'https://integration.spokephone.com',
  authUrl: 'https://auth.spokephone.com/oauth/token',
  ephemeral: false,
};

describe('api/groups', () => {
  let tmp: TmpHome;
  beforeAll(() => disableRealNetwork());
  afterAll(() => restoreNetwork());
  beforeEach(() => {
    tmp = setupTmpHome();
    nock.cleanAll();
  });
  afterEach(() => tmp.cleanup());

  it('list filters directory to callGroup type', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').reply(200, [
      { extension: '101', type: 'user' },
      { extension: '200', displayName: 'Sales', type: 'callGroup' },
    ]);
    const c = new SpokeApiClient({ active: profile });
    const out = await groups.list(c);
    expect(out).toHaveLength(1);
    expect(out[0].displayName).toBe('Sales');
  });

  it('get fetches a group by id', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory/200').reply(200, {
      extension: '200', displayName: 'Sales', type: 'callGroup',
      members: [{ extension: '101', available: true }, { extension: '102', available: false }],
    });
    const c = new SpokeApiClient({ active: profile });
    const g = await groups.get(c, '200');
    expect(g.displayName).toBe('Sales');
  });

  it('members applies available filter', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory/200').reply(200, {
      extension: '200', type: 'callGroup',
      members: [{ extension: '101', available: true }, { extension: '102', available: false }],
    });
    const c = new SpokeApiClient({ active: profile });
    const m = await groups.members(c, '200', { available: true });
    expect(m).toHaveLength(1);
  });

  it('availability returns total + available count', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory/200').reply(200, {
      extension: '200', type: 'callGroup',
      members: [
        { extension: '101', available: true },
        { extension: '102', available: true },
        { extension: '103', available: false },
      ],
    });
    const c = new SpokeApiClient({ active: profile });
    const a = await groups.availability(c, '200');
    expect(a.total).toBe(3);
    expect(a.available).toBe(2);
  });

  it('redirectUrl includes ext + group=1', () => {
    const url = groups.redirectUrl('200');
    expect(url).toContain('ext=200');
    expect(url).toContain('group=1');
  });
});
