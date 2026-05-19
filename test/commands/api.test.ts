import nock from 'nock';
import { runCli } from '../helpers/run-cli';
import { setupTmpHome, TmpHome } from '../helpers/tmp-home';
import { disableRealNetwork, restoreNetwork, mockTokenEndpoint } from '../helpers/nock-setup';

describe('spoke api command', () => {
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

  it('GETs the path and prints JSON', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').reply(200, [{ extension: '101' }]);
    const result = await runCli(['api', '/directory']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('"extension"');
  });

  it('parses query string from path', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/directory')
      .query({ page: '2', limit: '50' })
      .reply(200, []);
    const result = await runCli(['api', '/directory?page=2&limit=50']);
    expect(result.exitCode).toBe(0);
  });

  it('POSTs with --field arguments', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .post('/webhooks', { url: 'https://x', events: ['call.started'] })
      .reply(201, { id: 'wh1' });
    const result = await runCli([
      'api', '/webhooks',
      '--method', 'POST',
      '--field', 'url=https://x',
      '--field', 'events[]=call.started',
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('wh1');
  });

  it('--include shows response headers', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/x').reply(200, { ok: true }, { 'X-Test': 'yes' });
    const result = await runCli(['api', '/x', '--include']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('HTTP 200');
    expect(result.stdout.toLowerCase()).toContain('x-test');
  });

  it('paginates when --paginate is given', async () => {
    mockTokenEndpoint({ persistent: true });
    nock('https://integration.spokephone.com').get('/x').reply(200, { entries: [1, 2], next: 'cursor' });
    nock('https://integration.spokephone.com').get('/x').query({ next: 'cursor' }).reply(200, { entries: [3] });
    const result = await runCli(['api', '/x', '--paginate']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('1');
    expect(result.stdout).toContain('3');
  });

  it('--field rejects malformed entries', async () => {
    const result = await runCli(['api', '/x', '--method', 'POST', '--field', 'invalid']);
    expect(result.exitCode).toBe(1);
  });

  it('coerces booleans and numbers in --field', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .post('/x', { ok: true, n: 42 })
      .reply(200, {});
    const result = await runCli([
      'api', '/x', '--method', 'POST',
      '--field', 'ok=true',
      '--field', 'n=42',
    ]);
    expect(result.exitCode).toBe(0);
  });

  it('--header attaches headers', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com', { reqheaders: { 'X-Custom': 'yes' } })
      .get('/x')
      .reply(200, {});
    const result = await runCli(['api', '/x', '--header', 'X-Custom: yes']);
    expect(result.exitCode).toBe(0);
  });
});
