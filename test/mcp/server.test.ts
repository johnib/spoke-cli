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

  it('exposes the spec\'s required tool names', () => {
    const tools = buildTools();
    const names = tools.map((t) => t.name);
    for (const n of [
      'spoke_directory_list',
      'spoke_directory_get',
      'spoke_user_availability',
      'spoke_group_availability',
      'spoke_group_members',
      'spoke_call_transfer',
      'spoke_call_twiml_url',
      'spoke_message_send',
      'spoke_webhook_list',
      'spoke_api',
    ]) {
      expect(names).toContain(n);
    }
  });

  it('each tool has a description and input schema', () => {
    for (const t of buildTools()) {
      expect(t.description.length).toBeGreaterThan(0);
      expect(t.inputSchema.type).toBe('object');
    }
  });

  it('spoke_directory_list invokes the directory list API', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').reply(200, [
      { extension: '101', displayName: 'Alice', type: 'user' },
    ]);
    const tool = buildTools().find((t) => t.name === 'spoke_directory_list')!;
    const out = (await tool.run({})) as any[];
    expect(out).toHaveLength(1);
    expect(out[0].displayName).toBe('Alice');
  });

  it('spoke_message_send POSTs', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .post('/conversationMessages')
      .reply(201, { id: 'm1' });
    const tool = buildTools().find((t) => t.name === 'spoke_message_send')!;
    const out = (await tool.run({ to: '+1', from: '101', body: 'hi' })) as any;
    expect(out.id).toBe('m1');
  });

  it('spoke_call_twiml_url returns a URL', async () => {
    const tool = buildTools().find((t) => t.name === 'spoke_call_twiml_url')!;
    const out = (await tool.run({ extension: '101' })) as any;
    expect(out.url).toContain('ext=101');
  });

  it('createServer builds an MCP Server with handlers', () => {
    const server = createServer();
    expect(server).toBeTruthy();
  });

  it('spoke_directory_get fetches a single entry', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory/101').reply(200, {
      extension: '101', displayName: 'Alice',
    });
    const tool = buildTools().find((t) => t.name === 'spoke_directory_get')!;
    const out = (await tool.run({ idOrName: '101' })) as any;
    expect(out.displayName).toBe('Alice');
  });

  it('spoke_user_availability resolves a user', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/users/101').reply(200, {
      id: 'u', extension: '101', status: 'available', available: true,
    });
    const tool = buildTools().find((t) => t.name === 'spoke_user_availability')!;
    const out = (await tool.run({ id: '101' })) as any;
    expect(out.available).toBe(true);
  });

  it('spoke_group_availability returns counts', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory/200').reply(200, {
      extension: '200', type: 'callGroup',
      members: [{ available: true }, { available: false }],
    });
    const tool = buildTools().find((t) => t.name === 'spoke_group_availability')!;
    const out = (await tool.run({ id: '200' })) as any;
    expect(out.total).toBe(2);
    expect(out.available).toBe(1);
  });

  it('spoke_group_members lists members', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory/200').reply(200, {
      extension: '200', type: 'callGroup',
      members: [{ extension: '101', available: true }],
    });
    const tool = buildTools().find((t) => t.name === 'spoke_group_members')!;
    const out = (await tool.run({ id: '200', available: true })) as any[];
    expect(out).toHaveLength(1);
  });

  it('spoke_call_transfer routes by extension vs +E164', async () => {
    mockTokenEndpoint({ persistent: true });
    nock('https://api.spokephone.com')
      .post('/telephony/redirect', (b: any) => b.extension === '101')
      .reply(200, { ok: true });
    const tool = buildTools().find((t) => t.name === 'spoke_call_transfer')!;
    await tool.run({ sid: 'CA1', to: '101' });

    nock('https://api.spokephone.com')
      .post('/telephony/redirect', (b: any) => b.number === '+12125551111')
      .reply(200, {});
    await tool.run({ sid: 'CA1', to: '+12125551111' });
  });

  it('spoke_webhook_list invokes the webhooks API', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/webhooks').reply(200, [{ id: 'wh1', url: 'https://x', events: [] }]);
    const tool = buildTools().find((t) => t.name === 'spoke_webhook_list')!;
    const out = (await tool.run({})) as any[];
    expect(out[0].id).toBe('wh1');
  });

  it('spoke_api passes through arbitrary requests', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/anything').reply(200, { hello: 'world' });
    const tool = buildTools().find((t) => t.name === 'spoke_api')!;
    const out = (await tool.run({ path: '/anything' })) as any;
    expect(out.hello).toBe('world');
  });

  it('spoke_api supports POST with body', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').post('/x', { a: 1 }).reply(201, {});
    const tool = buildTools().find((t) => t.name === 'spoke_api')!;
    await tool.run({ method: 'POST', path: '/x', body: { a: 1 } });
  });
});
