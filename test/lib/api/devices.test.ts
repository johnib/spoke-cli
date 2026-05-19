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

  function setupTrunkChain() {
    mockTokenEndpoint({ persistent: true });
    nock('https://integration.spokephone.com').get('/trunks').reply(200, [{ id: 't1' }]);
    nock('https://integration.spokephone.com').get('/trunks/t1/trunkDevices').reply(200, [
      { id: 'dev_a', userName: 'Alice', userId: 'u1', type: 'mobile', platform: 'iOS', active: true, status: 'active' },
      { id: 'dev_b', userName: 'Bob', userId: 'u2', type: 'desktop', platform: 'macOS', active: false, status: 'idle' },
    ]);
  }

  it('list flattens trunkDevices across trunks', async () => {
    setupTrunkChain();
    const c = new SpokeApiClient({ active: profile });
    const arr = await devices.list(c);
    expect(arr).toHaveLength(2);
  });

  it('list filters by user/type/active', async () => {
    setupTrunkChain();
    const c = new SpokeApiClient({ active: profile });
    const onlyAlice = await devices.list(c, { user: 'Alice' });
    expect(onlyAlice.map((d) => d.id)).toEqual(['dev_a']);
    setupTrunkChain();
    const onlyMobile = await devices.list(new SpokeApiClient({ active: profile }), { type: 'mobile' });
    expect(onlyMobile.map((d) => d.id)).toEqual(['dev_a']);
    setupTrunkChain();
    const onlyActive = await devices.list(new SpokeApiClient({ active: profile }), { active: true });
    expect(onlyActive.map((d) => d.id)).toEqual(['dev_a']);
  });

  it('get returns the device with the matching id', async () => {
    setupTrunkChain();
    const c = new SpokeApiClient({ active: profile });
    const d = await devices.get(c, 'dev_a');
    expect(d.id).toBe('dev_a');
  });

  it('get throws when device not found', async () => {
    setupTrunkChain();
    const c = new SpokeApiClient({ active: profile });
    await expect(devices.get(c, 'absent')).rejects.toThrow(/not found/);
  });
});
