import nock from 'nock';
import { runCli } from '../helpers/run-cli';
import { setupTmpHome, TmpHome } from '../helpers/tmp-home';
import { disableRealNetwork, restoreNetwork, mockTokenEndpoint } from '../helpers/nock-setup';

describe('spoke device commands', () => {
  let tmp: TmpHome;
  beforeAll(() => disableRealNetwork());
  afterAll(() => restoreNetwork());
  beforeEach(() => {
    tmp = setupTmpHome();
    nock.cleanAll();
    process.env.SPOKE_CLIENT_ID = 'cid';
    process.env.SPOKE_CLIENT_SECRET = 'sec';
  });
  afterEach(() => {
    tmp.cleanup();
    delete process.env.SPOKE_CLIENT_ID;
    delete process.env.SPOKE_CLIENT_SECRET;
  });

  function setupTrunkChain() {
    mockTokenEndpoint({ persistent: true });
    nock('https://integration.spokephone.com').get('/trunks').reply(200, [{ id: 't1' }]);
    nock('https://integration.spokephone.com').get('/trunks/t1/trunkDevices').reply(200, [
      { id: 'dev_a', userName: 'Alice', type: 'mobile', platform: 'iOS', active: true, status: 'active' },
    ]);
  }

  it('list prints devices', async () => {
    setupTrunkChain();
    const result = await runCli(['device', 'list']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('dev_a');
  });

  it('get prints details', async () => {
    setupTrunkChain();
    const result = await runCli(['device', 'get', 'dev_a']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Alice');
  });
});
