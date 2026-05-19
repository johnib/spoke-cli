import nock from 'nock';
import { runCli } from '../helpers/run-cli';
import { setupTmpHome, TmpHome } from '../helpers/tmp-home';
import { disableRealNetwork, restoreNetwork, mockTokenEndpoint } from '../helpers/nock-setup';

describe('spoke message commands', () => {
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

  it('list prints messages', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/conversationMessages').reply(200, [
      { id: 'm1', direction: 'inbound', from: '+1', to: '+2', channel: 'sms', body: 'hi' },
    ]);
    const result = await runCli(['message', 'list']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('m1');
  });

  it('get prints message', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/conversationMessages/m1').reply(200, { id: 'm1', body: 'hi' });
    const result = await runCli(['message', 'get', 'm1']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('hi');
  });

  it('send POSTs the message', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .post('/conversationMessages', { to: '+1', from: '101', body: 'hi', channel: 'sms' })
      .reply(201, { id: 'm1', status: 'queued' });
    const result = await runCli(['message', 'send', '--to', '+1', '--from', '101', '--body', 'hi']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('m1');
  });

  it('send refuses missing --body', async () => {
    const result = await runCli(['message', 'send', '--to', '+1', '--from', '101']);
    expect(result.exitCode).not.toBe(0);
  });
});
