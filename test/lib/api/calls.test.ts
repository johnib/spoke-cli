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

  it('list returns entries with active included by default', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/calls')
      .query({ includeActive: 'true' })
      .reply(200, [{ sid: 'CA1', status: 'in-call' }]);
    const c = new SpokeApiClient({ active: profile });
    expect(await calls.list(c, { includeActive: true })).toHaveLength(1);
  });

  it('get fetches by id', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/calls/CA1').reply(200, { sid: 'CA1' });
    const c = new SpokeApiClient({ active: profile });
    expect((await calls.get(c, 'CA1')).sid).toBe('CA1');
  });

  it('redirect POSTs to api.spokephone.com', async () => {
    mockTokenEndpoint();
    nock('https://api.spokephone.com')
      .post('/telephony/redirect', (body: any) => body.callId === 'CA1' && body.extension === '101')
      .reply(200, { ok: true });
    const c = new SpokeApiClient({ active: profile });
    const out = await calls.redirect(c, 'CA1', { extension: '101' });
    expect((out as any).ok).toBe(true);
  });

  it('redirect supports +E164 numbers and passthrough fields', async () => {
    mockTokenEndpoint();
    nock('https://api.spokephone.com')
      .post('/telephony/redirect', (body: any) => body.number === '+12345' && body['x-foo'] === 'bar')
      .reply(200, {});
    const c = new SpokeApiClient({ active: profile });
    await calls.redirect(c, 'CA1', { number: '+12345', passthrough: { foo: 'bar' } });
  });

  it('hangup sends endCall=true', async () => {
    mockTokenEndpoint();
    nock('https://api.spokephone.com')
      .post('/telephony/redirect', (body: any) => body.endCall === true && body.callId === 'CA1')
      .reply(200, {});
    const c = new SpokeApiClient({ active: profile });
    await calls.hangup(c, 'CA1');
  });

  it('twimlRedirectUrl returns URL with ext + returnTo', () => {
    const u = calls.twimlRedirectUrl({ extension: '101', returnTo: 'https://x' });
    expect(u).toContain('ext=101');
    expect(u).toContain('returnTo=https');
  });
});
