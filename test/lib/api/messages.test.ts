import nock from 'nock';
import { setupTmpHome, TmpHome } from '../../helpers/tmp-home';
import { disableRealNetwork, restoreNetwork, mockTokenEndpoint } from '../../helpers/nock-setup';
import { SpokeApiClient } from '../../../src/lib/api/client';
import { ActiveProfile } from '../../../src/lib/auth/profiles';
import * as messages from '../../../src/lib/api/messages';

const profile: ActiveProfile = {
  name: 'default',
  clientId: 'cid',
  clientSecret: 'sec',
  apiUrl: 'https://integration.spokephone.com',
  authUrl: 'https://auth.spokephone.com/oauth/token',
  ephemeral: false,
};

describe('api/messages', () => {
  let tmp: TmpHome;
  beforeAll(() => disableRealNetwork());
  afterAll(() => restoreNetwork());
  beforeEach(() => {
    tmp = setupTmpHome();
    nock.cleanAll();
  });
  afterEach(() => tmp.cleanup());

  it('send POSTs to /conversationMessages', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .post('/conversationMessages', { to: '+1', from: '101', body: 'hi', channel: 'sms' })
      .reply(201, { id: 'm1', status: 'queued' });
    const c = new SpokeApiClient({ active: profile });
    const out = await messages.send(c, { to: '+1', from: '101', body: 'hi' });
    expect(out.id).toBe('m1');
  });

  it('send defaults channel to sms', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .post('/conversationMessages', (body: any) => body.channel === 'sms')
      .reply(201, {});
    const c = new SpokeApiClient({ active: profile });
    await messages.send(c, { to: '+1', from: '101', body: 'hi' });
  });

  it('send honours whatsapp channel', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .post('/conversationMessages', (body: any) => body.channel === 'whatsapp')
      .reply(201, {});
    const c = new SpokeApiClient({ active: profile });
    await messages.send(c, { to: '+1', from: '101', body: 'hi', channel: 'whatsapp' });
  });
});
