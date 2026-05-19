import nock from 'nock';
import { setupTmpHome, TmpHome } from '../../helpers/tmp-home';
import { disableRealNetwork, restoreNetwork, mockTokenEndpoint } from '../../helpers/nock-setup';
import { SpokeApiClient } from '../../../src/lib/api/client';
import { ActiveProfile } from '../../../src/lib/auth/profiles';
import { AuthError, NotFoundError, ApiError, RateLimitError, PermissionError } from '../../../src/lib/errors';

const profile: ActiveProfile = {
  name: 'default',
  clientId: 'cid',
  clientSecret: 'sec',
  apiUrl: 'https://integration.spokephone.com',
  authUrl: 'https://auth.spokephone.com/oauth/token',
  ephemeral: false,
};

describe('api/client', () => {
  let tmp: TmpHome;
  beforeAll(() => disableRealNetwork());
  afterAll(() => restoreNetwork());
  beforeEach(() => {
    tmp = setupTmpHome();
    nock.cleanAll();
  });
  afterEach(() => tmp.cleanup());

  it('GETs an endpoint with bearer token', async () => {
    mockTokenEndpoint();
    const scope = nock('https://integration.spokephone.com', {
      reqheaders: { Authorization: /Bearer .+/ },
    })
      .get('/directory')
      .reply(200, { entries: [{ id: '1' }] });
    const c = new SpokeApiClient({ active: profile });
    const res = await c.get('/directory');
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ entries: [{ id: '1' }] });
    scope.done();
  });

  it('passes query params through', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/calls')
      .query({ limit: '10', includeActive: 'true' })
      .reply(200, []);
    const c = new SpokeApiClient({ active: profile });
    await c.get('/calls', { limit: 10, includeActive: true });
  });

  it('omits undefined/null query params', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/calls')
      .query({ limit: '5' })
      .reply(200, []);
    const c = new SpokeApiClient({ active: profile });
    await c.get('/calls', { limit: 5, before: undefined, since: null });
  });

  it('POSTs JSON body', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .post('/webhooks', { url: 'x' })
      .reply(201, { id: 'wh_1' });
    const c = new SpokeApiClient({ active: profile });
    const res = await c.post('/webhooks', { url: 'x' });
    expect(res.status).toBe(201);
  });

  it('maps 401 to refresh + retry, then succeeds', async () => {
    mockTokenEndpoint({ token: 'first' });
    nock('https://integration.spokephone.com').get('/users').reply(401, { message: 'expired' });
    mockTokenEndpoint({ token: 'second' });
    nock('https://integration.spokephone.com').get('/users').reply(200, [{ id: '1' }]);

    const c = new SpokeApiClient({ active: profile });
    const res = await c.get('/users');
    expect(res.status).toBe(200);
  });

  it('maps persistent 401 (after refresh) to AuthError', async () => {
    mockTokenEndpoint({ token: 'first' });
    nock('https://integration.spokephone.com').get('/users').reply(401, 'no');
    mockTokenEndpoint({ token: 'second' });
    nock('https://integration.spokephone.com').get('/users').reply(401, 'still no');

    const c = new SpokeApiClient({ active: profile });
    await expect(c.get('/users')).rejects.toBeInstanceOf(AuthError);
  });

  it('maps 404 to NotFoundError', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/users/999').reply(404, { message: 'no such user' });
    const c = new SpokeApiClient({ active: profile });
    await expect(c.get('/users/999')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('maps 403 to PermissionError', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/admin').reply(403, {});
    const c = new SpokeApiClient({ active: profile });
    await expect(c.get('/admin')).rejects.toBeInstanceOf(PermissionError);
  });

  it('maps 429 to RateLimitError', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/x').reply(429, {});
    const c = new SpokeApiClient({ active: profile });
    await expect(c.get('/x')).rejects.toBeInstanceOf(RateLimitError);
  });

  it('maps 500 to ApiError with exit code 6', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/x').reply(500, { message: 'oops' });
    const c = new SpokeApiClient({ active: profile });
    try {
      await c.get('/x');
      throw new Error('should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.exitCode).toBe(6);
    }
  });

  it('uses baseUrlOverride when supplied', async () => {
    mockTokenEndpoint();
    nock('https://api.spokephone.com').post('/telephony/redirect').reply(200, { ok: true });
    const c = new SpokeApiClient({ active: profile });
    const res = await c.request({
      method: 'POST',
      path: '/telephony/redirect',
      baseUrlOverride: 'https://api.spokephone.com',
      body: {},
    });
    expect(res.status).toBe(200);
  });

  it('dry-run skips the network entirely', async () => {
    const c = new SpokeApiClient({ active: profile, dryRun: true });
    const res = await c.get('/directory', { foo: 'bar' });
    expect(res.status).toBe(200);
    expect((res.data as any).dryRun).toBe(true);
  });

  it('paginate yields pages until next is empty', async () => {
    mockTokenEndpoint({ persistent: true });
    nock('https://integration.spokephone.com')
      .get('/calls')
      .reply(200, { entries: [{ id: 1 }], next: 'cursor1' });
    nock('https://integration.spokephone.com')
      .get('/calls')
      .query({ next: 'cursor1' })
      .reply(200, { entries: [{ id: 2 }] });

    const c = new SpokeApiClient({ active: profile });
    const collected: number[] = [];
    for await (const batch of c.paginate<{ id: number }>(
      '/calls',
      (page: any) => ({ items: page.entries, next: page.next }),
    )) {
      collected.push(...batch.map((b) => b.id));
    }
    expect(collected).toEqual([1, 2]);
  });

  it('collectPages flattens all pages', async () => {
    mockTokenEndpoint({ persistent: true });
    nock('https://integration.spokephone.com')
      .get('/x')
      .reply(200, { items: [1], next: 'c1' });
    nock('https://integration.spokephone.com')
      .get('/x')
      .query({ next: 'c1' })
      .reply(200, { items: [2, 3] });

    const c = new SpokeApiClient({ active: profile });
    const all = await c.collectPages<number>('/x', (page: any) => ({
      items: page.items,
      next: page.next,
    }));
    expect(all).toEqual([1, 2, 3]);
  });

  it('PUT, PATCH, DELETE helpers route correctly', async () => {
    mockTokenEndpoint({ persistent: true });
    nock('https://integration.spokephone.com').put('/x').reply(200, { m: 'put' });
    nock('https://integration.spokephone.com').patch('/x').reply(200, { m: 'patch' });
    nock('https://integration.spokephone.com').delete('/x').reply(204, '');

    const c = new SpokeApiClient({ active: profile });
    expect((await c.put('/x')).data).toEqual({ m: 'put' });
    expect((await c.patch('/x')).data).toEqual({ m: 'patch' });
    expect((await c.delete('/x')).status).toBe(204);
  });

  it('absolute URL paths are honoured', async () => {
    mockTokenEndpoint();
    nock('https://other.example.com').get('/y').reply(200, { ok: true });
    const c = new SpokeApiClient({ active: profile });
    const res = await c.request({ method: 'GET', path: 'https://other.example.com/y' });
    expect(res.status).toBe(200);
  });
});
