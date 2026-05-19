import nock from 'nock';
import { runCli } from '../helpers/run-cli';
import { setupTmpHome, TmpHome } from '../helpers/tmp-home';
import { disableRealNetwork, restoreNetwork, mockTokenEndpoint } from '../helpers/nock-setup';

describe('spoke webhook commands', () => {
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

  it('list prints webhooks', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/webhooks').reply(200, {
      meta: {},
      webhooks: [{ id: 'wh1', url: 'https://x', events: ['call.started'], mode: 'production', enabled: true }],
    });
    const r = await runCli(['webhook', 'list']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('wh1');
  });

  it('create POSTs and prints the new webhook', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .post('/webhooks', (body: any) => body.url === 'https://x' && body.events.length > 0)
      .reply(201, { id: 'wh1', url: 'https://x', events: ['call.started'], mode: 'production', enabled: true, signingSecret: 'sk_xxx' });
    const r = await runCli([
      'webhook', 'create',
      '--url', 'https://x',
      '--events', 'call.started',
    ]);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('wh1');
    expect(r.stdout).toContain('sk_xxx');
  });

  it('delete --confirm DELETEs', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').delete('/webhooks/wh1').reply(204, '');
    const r = await runCli(['webhook', 'delete', 'wh1', '--confirm']);
    expect(r.exitCode).toBe(0);
  });

  it('delete refuses without --confirm', async () => {
    const r = await runCli(['webhook', 'delete', 'wh1']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('Refusing to delete');
  });

  it('replay subcommand has been removed (no such API endpoint)', async () => {
    const r = await runCli(['webhook', '--help']);
    expect(r.stdout).not.toContain('replay');
  });
});
