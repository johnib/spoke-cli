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

  it('list filters directory to type=device', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').query({ limit: '1000' }).reply(200, {
      meta: {},
      entries: [
        { id: 'd1', displayName: 'Reception phone', type: 'device' },
        { id: 'u1', displayName: 'Alice', type: 'user' },
      ],
    });
    const r = await runCli(['device', 'list']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('Reception phone');
    expect(r.stdout).not.toContain('Alice');
  });

  it('get fetches a device by UUID', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/directory/8cbb9b90-3a86-11f1-9f00-5f8007bb0e93')
      .reply(200, { id: '8cbb9b90-3a86-11f1-9f00-5f8007bb0e93', displayName: 'Reception phone', type: 'device' });
    const r = await runCli(['device', 'get', '8cbb9b90-3a86-11f1-9f00-5f8007bb0e93']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('Reception phone');
  });
});
