import nock from 'nock';
import { runCli } from '../helpers/run-cli';
import { setupTmpHome, TmpHome } from '../helpers/tmp-home';
import { disableRealNetwork, restoreNetwork, mockTokenEndpoint } from '../helpers/nock-setup';

describe('spoke message commands', () => {
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

  it('send POSTs to /conversationMessages', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .post('/conversationMessages', { to: '+1', from: '101', body: 'hi', channel: 'sms' })
      .reply(201, { id: 'm1', status: 'queued' });
    const r = await runCli(['message', 'send', '--to', '+1', '--from', '101', '--body', 'hi']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('m1');
  });

  it('only send subcommand is registered (no list/get)', async () => {
    const r = await runCli(['message', '--help']);
    expect(r.stdout).toContain('send');
    expect(r.stdout).not.toContain('  list');
    expect(r.stdout).not.toMatch(/^\s+get\s+/m);
  });
});
