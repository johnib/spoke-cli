import nock from 'nock';
import { runCli } from '../helpers/run-cli';
import { setupTmpHome, TmpHome } from '../helpers/tmp-home';
import { disableRealNetwork, restoreNetwork, mockTokenEndpoint } from '../helpers/nock-setup';

// Exercises the `?? ''` / `?? 'unknown'` fallback branches in command formatters,
// boosting branch coverage and ensuring sparse responses render without crashing.

describe('format fallbacks across commands', () => {
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

  it('directory list handles entries missing fields', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').reply(200, [{}]);
    const r = await runCli(['directory', 'list']);
    expect(r.exitCode).toBe(0);
  });

  it('directory get handles sparse entries', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory/101').reply(200, {});
    const r = await runCli(['directory', 'get', '101']);
    expect(r.exitCode).toBe(0);
  });

  it('group list handles groups without members', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').reply(200, [
      { extension: '200', type: 'callGroup' },
    ]);
    const r = await runCli(['group', 'list']);
    expect(r.exitCode).toBe(0);
  });

  it('user list handles minimal users', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/users').reply(200, [{}]);
    const r = await runCli(['user', 'list']);
    expect(r.exitCode).toBe(0);
  });

  it('user get handles a sparse user', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/users/x').reply(200, {});
    const r = await runCli(['user', 'get', 'x']);
    expect(r.exitCode).toBe(0);
  });

  it('call list handles minimal calls', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/calls').query(true).reply(200, [{}]);
    const r = await runCli(['call', 'list']);
    expect(r.exitCode).toBe(0);
  });

  it('voicemail list handles minimal voicemails', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/voicemails').reply(200, [{}]);
    const r = await runCli(['voicemail', 'list']);
    expect(r.exitCode).toBe(0);
  });

  it('message list handles minimal messages', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/conversationMessages').reply(200, [{}]);
    const r = await runCli(['message', 'list']);
    expect(r.exitCode).toBe(0);
  });

  it('directory search returns the typed-but-unavailable case', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').reply(200, [
      { extension: '101', displayName: 'Alice', type: 'user' },
    ]);
    const r = await runCli(['directory', 'search', '101']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('101');
  });

  it('directory list --json --jq works together', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').reply(200, [
      { extension: '101', displayName: 'Alice', type: 'user' },
    ]);
    const r = await runCli(['--json', '--jq', '$.extension', 'directory', 'list']);
    expect(r.stdout.trim()).toBe('101');
  });

  it('--template emits formatted output', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').reply(200, [
      { extension: '101', displayName: 'Alice', type: 'user' },
    ]);
    const r = await runCli([
      '--template', '{{range .}}{{.extension}}\n{{end}}',
      'directory', 'list',
    ]);
    expect(r.stdout).toBe('101\n');
  });
});
