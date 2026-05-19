import nock from 'nock';
import { setupTmpHome, TmpHome } from '../helpers/tmp-home';
import { disableRealNetwork, restoreNetwork, mockTokenEndpoint } from '../helpers/nock-setup';
import { buildTools, createServer } from '../../src/mcp/server';

describe('mcp/server', () => {
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

  it('exposes only the API-backed tools (no dead-end tools)', () => {
    const names = buildTools().map((t) => t.name);
    for (const n of [
      'spoke_directory_list',
      'spoke_directory_get',
      'spoke_user_availability',
      'spoke_group_availability',
      'spoke_group_members',
      'spoke_call_list',
      'spoke_call_get',
      'spoke_voicemail_list',
      'spoke_message_send',
      'spoke_webhook_list',
      'spoke_api',
    ]) {
      expect(names).toContain(n);
    }
    // Removed tools — no API support.
    expect(names).not.toContain('spoke_call_transfer');
    expect(names).not.toContain('spoke_call_twiml_url'); // moved out of MCP since it's a pure URL builder; CLI keeps it
  });

  it('createServer constructs without throwing', () => {
    expect(createServer()).toBeTruthy();
  });

  it('spoke_directory_list invokes the directory list API', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').reply(200, {
      meta: {},
      entries: [{ id: 'u1', extension: '101', displayName: 'Alice', type: 'user' }],
    });
    const tool = buildTools().find((t) => t.name === 'spoke_directory_list')!;
    const out = (await tool.run({})) as any[];
    expect(out).toHaveLength(1);
    expect(out[0].displayName).toBe('Alice');
  });

  it('spoke_user_availability resolves a user', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').query({ extension: '101' }).reply(200, {
      meta: {},
      entries: [{
        id: 'u1', extension: '101', displayName: 'Alice', type: 'user',
        availability: { status: 'available', availabilitySummary: 'Available' },
      }],
    });
    const tool = buildTools().find((t) => t.name === 'spoke_user_availability')!;
    const out = (await tool.run({ id: '101' })) as any;
    expect(out.available).toBe(true);
  });

  it('spoke_voicemail_list scans /calls', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/calls')
      .query({ limit: '200', includeRecordingUrl: 'true' })
      .reply(200, {
        meta: {},
        calls: [{ id: 'c1', voicemail: { id: 'vm1', transcription: 't' } }],
      });
    const tool = buildTools().find((t) => t.name === 'spoke_voicemail_list')!;
    const out = (await tool.run({})) as any[];
    expect(out[0].id).toBe('vm1');
  });

  it('spoke_message_send POSTs to /conversationMessages', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .post('/conversationMessages')
      .reply(201, { id: 'm1' });
    const tool = buildTools().find((t) => t.name === 'spoke_message_send')!;
    const out = (await tool.run({ to: '+1', from: '101', body: 'hi' })) as any;
    expect(out.id).toBe('m1');
  });
});
