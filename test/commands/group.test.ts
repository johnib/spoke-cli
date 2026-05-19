import nock from 'nock';
import { runCli } from '../helpers/run-cli';
import { setupTmpHome, TmpHome } from '../helpers/tmp-home';
import { disableRealNetwork, restoreNetwork, mockTokenEndpoint } from '../helpers/nock-setup';

describe('spoke group commands', () => {
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

  function dirWith(entries: any[]) {
    nock('https://integration.spokephone.com').get('/directory').reply(200, entries);
  }
  function entry(id: string, opts: any = {}) {
    nock('https://integration.spokephone.com').get(`/directory/${id}`).reply(200, opts);
  }

  it('list filters to groups', async () => {
    mockTokenEndpoint();
    dirWith([
      { extension: '200', displayName: 'Sales', type: 'callGroup', members: [{ available: true }] },
    ]);
    const result = await runCli(['group', 'list']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Sales');
  });

  it('get prints details', async () => {
    mockTokenEndpoint();
    entry('200', {
      extension: '200', displayName: 'Sales', type: 'callGroup',
      members: [{ available: true }, { available: false }],
      routing: 'round-robin',
    });
    const result = await runCli(['group', 'get', '200']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Members:');
  });

  it('members lists members', async () => {
    mockTokenEndpoint();
    entry('200', {
      extension: '200', type: 'callGroup',
      members: [
        { extension: '101', displayName: 'Alice', available: true },
        { extension: '102', displayName: 'Bob', available: false },
      ],
    });
    const result = await runCli(['group', 'members', '200']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Alice');
    expect(result.stdout).toContain('Bob');
  });

  it('availability prints counts', async () => {
    mockTokenEndpoint();
    entry('200', {
      extension: '200', displayName: 'Sales', type: 'callGroup',
      members: [{ available: true }, { available: false }],
    });
    const result = await runCli(['group', 'availability', '200']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('1/2');
  });

  it('redirect-url prints a URL', async () => {
    const result = await runCli(['group', 'redirect-url', '200']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('ext=200');
  });
});
