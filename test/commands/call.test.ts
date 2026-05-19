import nock from 'nock';
import { runCli } from '../helpers/run-cli';
import { setupTmpHome, TmpHome } from '../helpers/tmp-home';
import { disableRealNetwork, restoreNetwork, mockTokenEndpoint } from '../helpers/nock-setup';

describe('spoke call commands', () => {
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

  it('list prints active calls', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/calls')
      .query({ includeActive: 'true' })
      .reply(200, [{ sid: 'CA1', from: '+1', to: 'ext 101', status: 'in-call', duration: 134 }]);
    const result = await runCli(['call', 'list']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('CA1');
    expect(result.stdout).toContain('00:02:14');
  });

  it('get prints details', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/calls/CA1').reply(200, { sid: 'CA1', status: 'completed' });
    const result = await runCli(['call', 'get', 'CA1']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('completed');
  });

  it('transfer requires --to', async () => {
    const result = await runCli(['call', 'transfer', 'CA1']);
    expect(result.exitCode).not.toBe(0);
  });

  it('transfer redirects to extension', async () => {
    mockTokenEndpoint();
    nock('https://api.spokephone.com')
      .post('/telephony/redirect', (body: any) => body.extension === '101')
      .reply(200, { ok: true });
    const result = await runCli(['call', 'transfer', 'CA1', '--to', '101']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('blind transfer');
  });

  it('transfer --warm', async () => {
    mockTokenEndpoint();
    nock('https://api.spokephone.com').post('/telephony/redirect').reply(200, {});
    const result = await runCli(['call', 'transfer', 'CA1', '--to', '101', '--warm']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('warm');
  });

  it('redirect calls the endpoint', async () => {
    mockTokenEndpoint();
    nock('https://api.spokephone.com').post('/telephony/redirect').reply(200, {});
    const result = await runCli(['call', 'redirect', 'CA1', '--to', '101']);
    expect(result.exitCode).toBe(0);
  });

  it('hangup sends endCall', async () => {
    mockTokenEndpoint();
    nock('https://api.spokephone.com')
      .post('/telephony/redirect', (body: any) => body.endCall === true)
      .reply(200, {});
    const result = await runCli(['call', 'hangup', 'CA1']);
    expect(result.exitCode).toBe(0);
  });

  it('twiml-url prints URL', async () => {
    const result = await runCli(['call', 'twiml-url', '--extension', '101']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('ext=101');
  });
});
