import nock from 'nock';
import { setupTmpHome, TmpHome } from '../../helpers/tmp-home';
import { disableRealNetwork, restoreNetwork, mockTokenEndpoint } from '../../helpers/nock-setup';
import { SpokeApiClient } from '../../../src/lib/api/client';
import { ActiveProfile } from '../../../src/lib/auth/profiles';
import * as webhooks from '../../../src/lib/api/webhooks';

const profile: ActiveProfile = {
  name: 'default',
  clientId: 'cid',
  clientSecret: 'sec',
  apiUrl: 'https://integration.spokephone.com',
  authUrl: 'https://auth.spokephone.com/oauth/token',
  ephemeral: false,
};

describe('api/webhooks', () => {
  let tmp: TmpHome;
  beforeAll(() => disableRealNetwork());
  afterAll(() => restoreNetwork());
  beforeEach(() => {
    tmp = setupTmpHome();
    nock.cleanAll();
  });
  afterEach(() => tmp.cleanup());

  it('list returns webhooks', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/webhooks').reply(200, [{ id: 'wh1', url: 'https://x', events: ['call.started'] }]);
    const c = new SpokeApiClient({ active: profile });
    expect((await webhooks.list(c))[0].id).toBe('wh1');
  });

  it('get fetches by id', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/webhooks/wh1').reply(200, { id: 'wh1', url: 'https://x', events: [] });
    const c = new SpokeApiClient({ active: profile });
    expect((await webhooks.get(c, 'wh1')).id).toBe('wh1');
  });

  it('create POSTs', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .post('/webhooks', { url: 'https://x', events: ['call.started'], secret: 's' })
      .reply(201, { id: 'wh1', url: 'https://x', events: ['call.started'] });
    const c = new SpokeApiClient({ active: profile });
    const out = await webhooks.create(c, { url: 'https://x', events: ['call.started'], secret: 's' });
    expect(out.id).toBe('wh1');
  });

  it('update PUTs', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .put('/webhooks/wh1', { events: ['call.ended'] })
      .reply(200, { id: 'wh1', url: 'https://x', events: ['call.ended'] });
    const c = new SpokeApiClient({ active: profile });
    const out = await webhooks.update(c, 'wh1', { events: ['call.ended'] });
    expect(out.events).toEqual(['call.ended']);
  });

  it('remove DELETEs', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').delete('/webhooks/wh1').reply(204, '');
    const c = new SpokeApiClient({ active: profile });
    await webhooks.remove(c, 'wh1');
  });

  it('replay POSTs eventId', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').post('/webhooks/wh1/replay', { eventId: 'e1' }).reply(202, {});
    const c = new SpokeApiClient({ active: profile });
    await webhooks.replay(c, 'wh1', 'e1');
  });

  it('exports KNOWN_EVENTS', () => {
    expect(webhooks.KNOWN_EVENTS).toContain('call.started');
    expect(webhooks.KNOWN_EVENTS).toContain('message.received');
  });
});
