import nock from 'nock';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { setupTmpHome, TmpHome } from '../../helpers/tmp-home';
import { disableRealNetwork, restoreNetwork, mockTokenEndpoint } from '../../helpers/nock-setup';
import { SpokeApiClient } from '../../../src/lib/api/client';
import { ActiveProfile } from '../../../src/lib/auth/profiles';
import * as voicemails from '../../../src/lib/api/voicemails';

const profile: ActiveProfile = {
  name: 'default',
  clientId: 'cid',
  clientSecret: 'sec',
  apiUrl: 'https://integration.spokephone.com',
  authUrl: 'https://auth.spokephone.com/oauth/token',
  ephemeral: false,
};

describe('api/voicemails', () => {
  let tmp: TmpHome;
  beforeAll(() => disableRealNetwork());
  afterAll(() => restoreNetwork());
  beforeEach(() => {
    tmp = setupTmpHome();
    nock.cleanAll();
  });
  afterEach(() => tmp.cleanup());

  it('list returns voicemails', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/voicemails').reply(200, [
      { id: 'vm1', read: false },
    ]);
    const c = new SpokeApiClient({ active: profile });
    expect(await voicemails.list(c)).toHaveLength(1);
  });

  it('list passes unread filter', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/voicemails').query({ unread: 'true' }).reply(200, []);
    const c = new SpokeApiClient({ active: profile });
    await voicemails.list(c, { unread: true });
  });

  it('get fetches a voicemail by id', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/voicemails/vm1').reply(200, { id: 'vm1' });
    const c = new SpokeApiClient({ active: profile });
    expect((await voicemails.get(c, 'vm1')).id).toBe('vm1');
  });

  it('transcript returns embedded transcript when present', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/voicemails/vm1').reply(200, { id: 'vm1', transcript: 'hello' });
    const c = new SpokeApiClient({ active: profile });
    expect(await voicemails.transcript(c, 'vm1')).toBe('hello');
  });

  it('transcript falls back to /transcripts/{id}', async () => {
    mockTokenEndpoint({ persistent: true });
    nock('https://integration.spokephone.com').get('/voicemails/vm1').reply(200, { id: 'vm1' });
    nock('https://integration.spokephone.com').get('/transcripts/vm1').reply(200, { text: 'from fallback' });
    const c = new SpokeApiClient({ active: profile });
    expect(await voicemails.transcript(c, 'vm1')).toBe('from fallback');
  });

  it('download writes the recording to disk', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/voicemails/vm1').reply(200, {
      id: 'vm1', recordingUrl: 'https://recordings.example/vm1.mp3',
    });
    nock('https://recordings.example').get('/vm1.mp3').reply(200, Buffer.from('mp3data'));
    const c = new SpokeApiClient({ active: profile });
    const out = path.join(os.tmpdir(), `spoke-vm-${Date.now()}.mp3`);
    await voicemails.download(c, 'vm1', out);
    expect(fs.readFileSync(out).toString()).toBe('mp3data');
    fs.unlinkSync(out);
  });

  it('download throws when no recordingUrl', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/voicemails/vm1').reply(200, { id: 'vm1' });
    const c = new SpokeApiClient({ active: profile });
    await expect(voicemails.download(c, 'vm1', '/tmp/x')).rejects.toThrow(/recording/);
  });
});
