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

  it('list prints a table with availability summary', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').reply(200, {
      meta: {},
      entries: [
        { id: 'u1', extension: '101', displayName: 'Alice', type: 'user', availability: { availabilitySummary: 'Available', status: 'available' } },
      ],
    });
    const r = await runCli(['directory', 'list']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('Alice');
    expect(r.stdout).toContain('Available');
  });

  it('list --json emits raw entries', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').reply(200, {
      meta: {},
      entries: [{ id: 'u1', extension: '101', displayName: 'Alice', type: 'user' }],
    });
    const r = await runCli(['--json', 'directory', 'list']);
    expect(r.stdout).toContain('"displayName": "Alice"');
  });

  it('get by extension uses ?extension= query', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').query({ extension: '101' }).reply(200, {
      meta: {},
      entries: [{ id: 'u1', extension: '101', displayName: 'Alice', type: 'user', email: 'a@x' }],
    });
    const r = await runCli(['directory', 'get', '101']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('Alice');
    expect(r.stdout).toContain('a@x');
  });

  it('get exits 3 on extension not found', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').query({ extension: '999' }).reply(200, { meta: {}, entries: [] });
    const r = await runCli(['directory', 'get', '999']);
    expect(r.exitCode).toBe(3);
  });

  it('search matches by name substring', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').query({ limit: '1000' }).reply(200, {
      meta: {},
      entries: [{ id: 't1', extension: '200', displayName: 'Sales Team', type: 'team' }],
    });
    const r = await runCli(['directory', 'search', 'sales']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('Sales Team');
  });

  it('dry-run skips network', async () => {
    const r = await runCli(['--dry-run', 'directory', 'list']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('[dry-run]');
  });
});
