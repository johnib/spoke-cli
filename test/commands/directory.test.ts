import nock from 'nock';
import { runCli } from '../helpers/run-cli';
import { setupTmpHome, TmpHome } from '../helpers/tmp-home';
import { disableRealNetwork, restoreNetwork, mockTokenEndpoint } from '../helpers/nock-setup';

describe('spoke directory commands', () => {
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

  it('list prints a table', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').reply(200, [
      { extension: '101', displayName: 'Alice', type: 'user', available: true },
      { extension: '200', displayName: 'Sales', type: 'callGroup' },
    ]);
    const result = await runCli(['directory', 'list']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('EXTENSION');
    expect(result.stdout).toContain('Alice');
    expect(result.stdout).toContain('Sales');
  });

  it('list --json emits JSON', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').reply(200, [
      { extension: '101', displayName: 'Alice', type: 'user' },
    ]);
    const result = await runCli(['--json', 'directory', 'list']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('"displayName": "Alice"');
  });

  it('list --jq filters', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').reply(200, [
      { extension: '101', displayName: 'Alice', type: 'user' },
      { extension: '102', displayName: 'Bob', type: 'user' },
    ]);
    const result = await runCli(['--jq', '$.displayName', 'directory', 'list']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('Alice\nBob');
  });

  it('list --silent emits nothing', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').reply(200, []);
    const result = await runCli(['--silent', 'directory', 'list']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
  });

  it('get prints a human key:value view', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory/101').reply(200, {
      extension: '101', displayName: 'Alice', type: 'user', status: 'available',
    });
    const result = await runCli(['directory', 'get', '101']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Extension:');
    expect(result.stdout).toContain('Alice');
  });

  it('get exits 3 on not found', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory/999').reply(404, { message: 'no' });
    const result = await runCli(['directory', 'get', '999']);
    expect(result.exitCode).toBe(3);
  });

  it('search matches by name', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').reply(200, [
      { extension: '200', displayName: 'Sales Team', type: 'callGroup' },
    ]);
    const result = await runCli(['directory', 'search', 'sales']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Sales Team');
  });

  it('dry-run does not hit the API', async () => {
    // No nock interceptor — would fail if a request were made (net disabled).
    const result = await runCli(['--dry-run', 'directory', 'list']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('[dry-run]');
  });
});
