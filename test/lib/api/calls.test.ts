import nock from 'nock';
import { setupTmpHome, TmpHome } from '../../helpers/tmp-home';
import { disableRealNetwork, restoreNetwork, mockTokenEndpoint } from '../../helpers/nock-setup';
import { SpokeApiClient } from '../../../src/lib/api/client';
import { ActiveProfile } from '../../../src/lib/auth/profiles';
import * as calls from '../../../src/lib/api/calls';

const profile: ActiveProfile = {
  name: 'default',
  clientId: 'cid',
  clientSecret: 'sec',
  apiUrl: 'https://integration.spokephone.com',
  authUrl: 'https://auth.spokephone.com/oauth/token',
  ephemeral: false,
};

describe('api/calls', () => {
  let tmp: TmpHome;
  beforeAll(() => disableRealNetwork());
  afterAll(() => restoreNetwork());
  beforeEach(() => {
    tmp = setupTmpHome();
    nock.cleanAll();
  });
  afterEach(() => tmp.cleanup());

  it('list reads from { meta, calls } envelope', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/calls').reply(200, {
      meta: { next: 'cursor1' },
      calls: [{ id: 'c1', direction: 'inbound', status: 'accepted', duration: 16976 }],
    });
    const c = new SpokeApiClient({ active: profile });
    expect(await calls.list(c)).toHaveLength(1);
  });

  it('list passes filters as query', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/calls')
      .query({ includeActive: 'true', limit: '5' })
      .reply(200, { meta: {}, calls: [] });
    const c = new SpokeApiClient({ active: profile });
    await calls.list(c, { includeActive: true, limit: 5 });
  });

  it('get fetches by id', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/calls/c1').reply(200, { id: 'c1', direction: 'inbound' });
    const c = new SpokeApiClient({ active: profile });
    expect((await calls.get(c, 'c1')).id).toBe('c1');
  });

  it('get passes includeRecordingUrl only when requested', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/calls/c1').query({ includeRecordingUrl: 'true' }).reply(200, { id: 'c1' });
    const c = new SpokeApiClient({ active: profile });
    await calls.get(c, 'c1', { includeRecordingUrl: true });
  });

  describe('twimlRedirectUrl', () => {
    it('emits parameters in the canonical signature order', () => {
      const url = calls.twimlRedirectUrl({
        extension: '101',
        organisationId: 'org-1',
        priority: 7,
        returnTo: 'flow',
        returnToId: 'FW-1',
      });
      // extension first, nextOfferTimeout (absent), organisationId, priority, returnTo, returnToId
      expect(url.indexOf('extension=101')).toBeLessThan(url.indexOf('organisationId=org-1'));
      expect(url.indexOf('organisationId=org-1')).toBeLessThan(url.indexOf('priority=7'));
      expect(url.indexOf('priority=7')).toBeLessThan(url.indexOf('returnTo=flow'));
      expect(url.indexOf('returnTo=flow')).toBeLessThan(url.indexOf('returnToId=FW-1'));
    });

    it('omits optional params when not provided', () => {
      const url = calls.twimlRedirectUrl({ extension: '101' });
      expect(url).toContain('extension=101');
      expect(url).not.toContain('organisationId');
      expect(url).not.toContain('priority');
    });

    it('URL-encodes the returnToId for postEndpoint mode', () => {
      const url = calls.twimlRedirectUrl({
        extension: '101',
        returnTo: 'postEndpoint',
        returnToId: 'https://example.com/cb',
      });
      expect(url).toContain('returnToId=https%3A%2F%2Fexample.com%2Fcb');
    });
  });

  describe('toMs (seconds-or-ms coercion)', () => {
    it('multiplies seconds-magnitude values by 1000', () => {
      expect(calls.toMs(1715040000)).toBe(1715040000_000);
    });
    it('passes through ms-magnitude values unchanged', () => {
      expect(calls.toMs(1715040000000)).toBe(1715040000000);
    });
    it('handles undefined', () => {
      expect(calls.toMs(undefined)).toBeUndefined();
    });
    it('treats zero as undefined-like (zero in ms is still zero)', () => {
      expect(calls.toMs(0)).toBe(0);
    });
  });

  it('list auto-converts since/before from seconds to ms', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/calls')
      .query({ since: '1715040000000', before: '1715299200000' })
      .reply(200, { meta: {}, calls: [] });
    const c = new SpokeApiClient({ active: profile });
    await calls.list(c, { since: 1715040000, before: 1715299200 });
  });

  it('list passes ms-magnitude values through unchanged', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/calls')
      .query({ since: '1715040000000' })
      .reply(200, { meta: {}, calls: [] });
    const c = new SpokeApiClient({ active: profile });
    await calls.list(c, { since: 1715040000000 });
  });

  describe('listAll', () => {
    it('follows meta.next until exhausted', async () => {
      mockTokenEndpoint({ persistent: true });
      nock('https://integration.spokephone.com')
        .get('/calls')
        .query({ limit: '1000' })
        .reply(200, { meta: { next: 'cursor-1' }, calls: [{ id: 'c1' }, { id: 'c2' }] });
      nock('https://integration.spokephone.com')
        .get('/calls')
        .query({ limit: '1000', next: 'cursor-1' })
        .reply(200, { meta: { next: 'cursor-2' }, calls: [{ id: 'c3' }] });
      nock('https://integration.spokephone.com')
        .get('/calls')
        .query({ limit: '1000', next: 'cursor-2' })
        .reply(200, { meta: { next: null }, calls: [{ id: 'c4' }] });

      const c = new SpokeApiClient({ active: profile });
      const all = await calls.listAll(c);
      expect(all.map((x) => x.id)).toEqual(['c1', 'c2', 'c3', 'c4']);
    });

    it('stops on empty calls array even if next is present', async () => {
      mockTokenEndpoint();
      nock('https://integration.spokephone.com')
        .get('/calls')
        .query({ limit: '1000' })
        .reply(200, { meta: { next: 'cursor' }, calls: [] });
      const c = new SpokeApiClient({ active: profile });
      expect(await calls.listAll(c)).toEqual([]);
    });

    it('reports per-page progress via the onPage callback', async () => {
      mockTokenEndpoint({ persistent: true });
      nock('https://integration.spokephone.com').get('/calls').query({ limit: '1000' })
        .reply(200, { meta: { next: 'c1' }, calls: [{ id: 'a' }] });
      nock('https://integration.spokephone.com').get('/calls').query({ limit: '1000', next: 'c1' })
        .reply(200, { meta: {}, calls: [{ id: 'b' }] });
      const c = new SpokeApiClient({ active: profile });
      const pages: Array<[number, number]> = [];
      await calls.listAll(c, {}, (p, t) => pages.push([p, t]));
      expect(pages).toEqual([[1, 1], [2, 2]]);
    });

    it('auto-converts since/before in listAll too', async () => {
      mockTokenEndpoint();
      nock('https://integration.spokephone.com')
        .get('/calls')
        .query({ since: '1715040000000', limit: '1000' })
        .reply(200, { meta: {}, calls: [] });
      const c = new SpokeApiClient({ active: profile });
      await calls.listAll(c, { since: 1715040000 });
    });
  });

  describe('formatDurationMs', () => {
    it('renders milliseconds as HH:MM:SS', () => {
      expect(calls.formatDurationMs(16976)).toBe('00:00:16');
      expect(calls.formatDurationMs(125_000)).toBe('00:02:05');
      expect(calls.formatDurationMs(3_661_000)).toBe('01:01:01');
    });

    it('returns 00:00:00 for undefined/zero', () => {
      expect(calls.formatDurationMs(undefined)).toBe('00:00:00');
      expect(calls.formatDurationMs(0)).toBe('00:00:00');
    });
  });
});
