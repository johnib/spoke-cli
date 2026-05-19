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
    nock('https://integration.spokephone.com').get('/webhooks').reply(200, [
      { id: 'wh1', url: 'https://x', events: ['call.started'], status: 'active' },
    ]);
    const result = await runCli(['webhook', 'list']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('wh1');
  });

  it('create POSTs and prints the result', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .post('/webhooks', (body: any) => body.url === 'https://x' && Array.isArray(body.events))
      .reply(201, { id: 'wh1', url: 'https://x', events: ['call.started'], status: 'active' });
    const result = await runCli([
      'webhook', 'create',
      '--url', 'https://x',
      '--events', 'call.started',
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('wh1');
  });

  it('delete refuses without --confirm', async () => {
    const result = await runCli(['webhook', 'delete', 'wh1']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Refusing to delete');
  });

  it('delete --confirm DELETEs', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').delete('/webhooks/wh1').reply(204, '');
    const result = await runCli(['webhook', 'delete', 'wh1', '--confirm']);
    expect(result.exitCode).toBe(0);
  });

  it('replay POSTs eventId', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .post('/webhooks/wh1/replay', { eventId: 'e1' })
      .reply(202, {});
    const result = await runCli(['webhook', 'replay', 'wh1', '--event-id', 'e1']);
    expect(result.exitCode).toBe(0);
  });
});
