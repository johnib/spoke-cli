import nock from 'nock';
import { runCli } from '../helpers/run-cli';
import { setupTmpHome, TmpHome } from '../helpers/tmp-home';
import { disableRealNetwork, restoreNetwork, mockTokenEndpoint } from '../helpers/nock-setup';

describe('spoke user commands', () => {
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

  it('list prints users', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/users').reply(200, [
      { id: 'u1', extension: '101', displayName: 'Alice', email: 'a@x' },
    ]);
    const result = await runCli(['user', 'list']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Alice');
  });

  it('get by id', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/users/101').reply(200, {
      id: 'u1', extension: '101', displayName: 'Alice',
    });
    const result = await runCli(['user', 'get', '101']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Alice');
  });

  it('get --me hits /users/me', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/users/me').reply(200, { id: 'self', displayName: 'Me' });
    const result = await runCli(['user', 'get', '--me']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Me');
  });

  it('availability prints status', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/users/101').reply(200, {
      id: 'u1', extension: '101', displayName: 'Alice', status: 'available', available: true,
    });
    const result = await runCli(['user', 'availability', '101']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Available:');
    expect(result.stdout).toContain('true');
  });

  it('set-availability PATCHes', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').patch('/users/101', { status: 'busy' }).reply(200, {
      id: 'u1', extension: '101', status: 'busy',
    });
    const result = await runCli(['user', 'set-availability', '101', '--status', 'busy']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('busy');
  });

  it('set-availability rejects invalid status', async () => {
    const result = await runCli(['user', 'set-availability', '101', '--status', 'silly']);
    expect(result.exitCode).toBe(1);
  });

  it('redirect-url prints a URL', async () => {
    const result = await runCli(['user', 'redirect-url', '101']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('ext=101');
  });
});
