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

  it('list prints users from .users envelope', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/users').reply(200, {
      meta: {},
      users: [{ id: 'u1', extension: '101', displayName: 'Alice', email: 'a@x', availability: { availabilitySummary: 'Available', status: 'available' } }],
    });
    const r = await runCli(['user', 'list']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('Alice');
  });

  it('get --me hits /users/me', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/users/me').reply(200, { id: 'self', displayName: 'Me' });
    const r = await runCli(['user', 'get', '--me']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('Me');
  });

  it('get by extension resolves via directory', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').query({ extension: '101' }).reply(200, {
      meta: {},
      entries: [{ id: 'u1', extension: '101', displayName: 'Alice', type: 'user' }],
    });
    const r = await runCli(['user', 'get', '101']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('Alice');
  });

  it('availability prints status from .availability', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').query({ extension: '101' }).reply(200, {
      meta: {},
      entries: [{
        id: 'u1', extension: '101', displayName: 'Alice', type: 'user',
        availability: { status: 'available', availabilitySummary: 'Available' },
      }],
    });
    const r = await runCli(['user', 'availability', '101']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('available');
    expect(r.stdout).toContain('Available');
  });

  it('redirect-url prints entry.twimlRedirectUrl from the API', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').query({ extension: '101' }).reply(200, {
      meta: {},
      entries: [{
        id: 'u1', extension: '101', displayName: 'Alice', type: 'user',
        twimlRedirectUrl: 'https://api.spokephone.com/telephony/redirect?extension=101&organisationId=org-1',
      }],
    });
    const r = await runCli(['user', 'redirect-url', '101']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('api.spokephone.com/telephony/redirect');
    expect(r.stdout).toContain('extension=101');
    expect(r.stdout).toContain('organisationId=org-1');
  });

  it('redirect-url exits 3 when entry has no twimlRedirectUrl', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').query({ extension: '101' }).reply(200, {
      meta: {},
      entries: [{ id: 'u1', extension: '101', type: 'user' }],
    });
    const r = await runCli(['user', 'redirect-url', '101']);
    expect(r.exitCode).toBe(3);
  });
});
