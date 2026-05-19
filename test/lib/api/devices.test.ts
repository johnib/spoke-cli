import nock from 'nock';
import { setupTmpHome, TmpHome } from '../../helpers/tmp-home';
import { disableRealNetwork, restoreNetwork, mockTokenEndpoint } from '../../helpers/nock-setup';
import { SpokeApiClient } from '../../../src/lib/api/client';
import { ActiveProfile } from '../../../src/lib/auth/profiles';
import * as devices from '../../../src/lib/api/devices';

const profile: ActiveProfile = {
  name: 'default',
  clientId: 'cid',
  clientSecret: 'sec',
  apiUrl: 'https://integration.spokephone.com',
  authUrl: 'https://auth.spokephone.com/oauth/token',
  ephemeral: false,
};

describe('api/devices', () => {
  let tmp: TmpHome;
  beforeAll(() => disableRealNetwork());
  afterAll(() => restoreNetwork());
  beforeEach(() => {
    tmp = setupTmpHome();
    nock.cleanAll();
  });
  afterEach(() => tmp.cleanup());

  it('list filters directory to type=device by default', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').query({ limit: '1000' }).reply(200, {
      meta: {},
      entries: [
        { id: 'd1', displayName: 'Reception phone', type: 'device' },
        { id: 'u1', displayName: 'Alice', type: 'user' },
      ],
    });
    const c = new SpokeApiClient({ active: profile });
    const arr = await devices.list(c);
    expect(arr).toHaveLength(1);
    expect(arr[0].id).toBe('d1');
  });

  it('list with --type trunkDevice', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').query({ limit: '1000' }).reply(200, {
      meta: {},
      entries: [
        { id: 'td1', displayName: 'SIP A', type: 'trunkDevice' },
      ],
    });
    const c = new SpokeApiClient({ active: profile });
    const arr = await devices.list(c, { type: 'trunkDevice' });
    expect(arr).toHaveLength(1);
  });

  it('list filters by user-substring', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').query({ limit: '1000' }).reply(200, {
      meta: {},
      entries: [
        { id: 'd1', displayName: 'Alice phone', type: 'device' },
        { id: 'd2', displayName: 'Bob phone', type: 'device' },
      ],
    });
    const c = new SpokeApiClient({ active: profile });
    const arr = await devices.list(c, { user: 'alice' });
    expect(arr.map((d) => d.id)).toEqual(['d1']);
  });

  it('get throws when matched entry is not a device', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').query({ extension: '101' }).reply(200, {
      meta: {},
      entries: [{ id: 'u1', extension: '101', type: 'user', displayName: 'Alice' }],
    });
    const c = new SpokeApiClient({ active: profile });
    await expect(devices.get(c, '101')).rejects.toThrow(/not a device/);
  });
});
