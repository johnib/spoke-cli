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

  it('list shows teams with member counts', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').query({ limit: '1000' }).reply(200, {
      meta: {},
      entries: [{
        id: 't1', extension: '200', displayName: 'Sales', type: 'team',
        availability: { status: 'available', totalMembers: 3, totalAvailable: 2 },
      }],
    });
    const r = await runCli(['group', 'list']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('Sales');
  });

  it('get shows the count summary', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').query({ extension: '200' }).reply(200, {
      meta: {},
      entries: [{
        id: 't1', extension: '200', displayName: 'Sales', type: 'team',
        availability: { status: 'available', totalMembers: 3, totalAvailable: 2, availabilitySummary: '2 of 3 people available' },
      }],
    });
    const r = await runCli(['group', 'get', '200']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('3 (2 available)');
  });

  it('members lists teamMembers', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').query({ extension: '200' }).reply(200, {
      meta: {},
      entries: [{
        id: 't1', extension: '200', type: 'team',
        teamMembers: [
          { id: 'u1', extension: '101', displayName: 'Alice', availability: { status: 'available' } },
        ],
      }],
    });
    const r = await runCli(['group', 'members', '200']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('Alice');
  });

  it('availability shows X/Y format', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').query({ extension: '200' }).reply(200, {
      meta: {},
      entries: [{
        id: 't1', extension: '200', displayName: 'Sales', type: 'team',
        availability: { status: 'available', totalMembers: 3, totalAvailable: 2 },
      }],
    });
    const r = await runCli(['group', 'availability', '200']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('2/3');
  });

  it('redirect-url prints entry.twimlRedirectUrl', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').query({ extension: '200' }).reply(200, {
      meta: {},
      entries: [{
        id: 't1', extension: '200', type: 'team',
        twimlRedirectUrl: 'https://api.spokephone.com/telephony/redirect?extension=200&organisationId=org-1',
      }],
    });
    const r = await runCli(['group', 'redirect-url', '200']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('extension=200');
  });
});
