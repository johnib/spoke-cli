import nock from 'nock';
import { runCli } from '../helpers/run-cli';
import { setupTmpHome, TmpHome } from '../helpers/tmp-home';
import { disableRealNetwork, restoreNetwork, mockTokenEndpoint } from '../helpers/nock-setup';
import { extractPage } from '../../src/commands/api';

describe('spoke api command', () => {
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

  it('GETs and prints JSON', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/users').query({ limit: '1' }).reply(200, { meta: {}, users: [{ id: 'u1' }] });
    const r = await runCli(['api', '/users?limit=1']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('"users"');
  });

  it('POSTs with --field arguments', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .post('/webhooks', { url: 'https://x', events: ['call.started'] })
      .reply(201, { id: 'wh1' });
    const r = await runCli([
      'api', '/webhooks',
      '--method', 'POST',
      '--field', 'url=https://x',
      '--field', 'events[]=call.started',
    ]);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('wh1');
  });

  it('--include prints HTTP status + headers', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/x').reply(200, { ok: true }, { 'X-Test': 'yes' });
    const r = await runCli(['api', '/x', '--include']);
    expect(r.stdout).toContain('HTTP 200');
    expect(r.stdout.toLowerCase()).toContain('x-test');
  });

  describe('--paginate', () => {
    it('follows meta.next on /calls envelope and merges results', async () => {
      mockTokenEndpoint({ persistent: true });
      nock('https://integration.spokephone.com')
        .get('/calls')
        .reply(200, { meta: { next: 'c1' }, calls: [{ id: 'a' }, { id: 'b' }] });
      nock('https://integration.spokephone.com')
        .get('/calls')
        .query({ next: 'c1' })
        .reply(200, { meta: {}, calls: [{ id: 'c' }] });
      const r = await runCli(['api', '/calls', '--paginate']);
      expect(r.exitCode).toBe(0);
      expect(r.stdout).toContain('"id": "a"');
      expect(r.stdout).toContain('"id": "b"');
      expect(r.stdout).toContain('"id": "c"');
    });

    it('also handles the legacy { entries, next } shape', async () => {
      mockTokenEndpoint({ persistent: true });
      nock('https://integration.spokephone.com')
        .get('/foo')
        .reply(200, { entries: [{ id: 1 }], next: 'c1' });
      nock('https://integration.spokephone.com')
        .get('/foo')
        .query({ next: 'c1' })
        .reply(200, { entries: [{ id: 2 }] });
      const r = await runCli(['api', '/foo', '--paginate']);
      expect(r.exitCode).toBe(0);
      expect(r.stdout).toContain('"id": 1');
      expect(r.stdout).toContain('"id": 2');
    });
  });
});

describe('extractPage helper', () => {
  it('handles { meta: { next }, calls } envelope', () => {
    expect(extractPage({ meta: { next: 'tok' }, calls: [{ id: 1 }] })).toEqual({
      items: [{ id: 1 }],
      next: 'tok',
    });
  });

  it('handles bare arrays', () => {
    expect(extractPage([{ id: 1 }])).toEqual({ items: [{ id: 1 }], next: null });
  });

  it('falls back to entries / items', () => {
    expect(extractPage({ entries: [{ id: 'e' }], next: 'tok' })).toEqual({
      items: [{ id: 'e' }],
      next: 'tok',
    });
    expect(extractPage({ items: [{ id: 'i' }] })).toEqual({
      items: [{ id: 'i' }],
      next: null,
    });
  });

  it('finds any array-valued top-level key (skipping meta)', () => {
    expect(extractPage({ meta: { next: 'x' }, weirdResource: [{ id: 1 }] })).toEqual({
      items: [{ id: 1 }],
      next: 'x',
    });
  });

  it('returns empty items when no array key found', () => {
    expect(extractPage({ meta: {} })).toEqual({ items: [], next: null });
  });
});
