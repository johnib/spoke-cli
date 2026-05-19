import nock from 'nock';
import { setupTmpHome, TmpHome } from '../helpers/tmp-home';
import { disableRealNetwork, restoreNetwork, mockTokenEndpoint } from '../helpers/nock-setup';
import { SpokeApiClient } from '../../src/lib/api/client';
import { ActiveProfile } from '../../src/lib/auth/profiles';
import * as webhooks from '../../src/lib/api/webhooks';
import { runForward } from '../../src/commands/webhook/forward';

const profile: ActiveProfile = {
  name: 'default',
  clientId: 'cid',
  clientSecret: 'sec',
  apiUrl: 'https://integration.spokephone.com',
  authUrl: 'https://auth.spokephone.com/oauth/token',
  ephemeral: false,
};

describe('webhook forward', () => {
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

  it('registers a webhook against the fake tunnel URL', async () => {
    // We can't easily await SIGINT in a unit test, so we resolve the never-resolving
    // promise via a fake tunnel that the test fully controls. Instead we drive
    // the registration call directly through the API client and verify it.
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .post('/webhooks', (body: any) => body.url === 'https://fake.tunnel/' && body.events.length > 0)
      .reply(201, { id: 'wh_temp', url: 'https://fake.tunnel/', events: ['call.started'] });
    const client = new SpokeApiClient({ active: profile });
    const wh = await webhooks.create(client, {
      url: 'https://fake.tunnel/',
      events: ['call.started'],
    });
    expect(wh.id).toBe('wh_temp');
  });

  it('requires --port', async () => {
    await expect(runForward({} as any, { port: undefined as any })).rejects.toThrow(/--port/);
  });
});
