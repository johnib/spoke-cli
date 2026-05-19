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

describe('api/voicemails (derived from /calls)', () => {
  let tmp: TmpHome;
  beforeAll(() => disableRealNetwork());
  afterAll(() => restoreNetwork());
  beforeEach(() => {
    tmp = setupTmpHome();
    nock.cleanAll();
  });
  afterEach(() => tmp.cleanup());

  it('list scans /calls and projects voicemail-bearing entries', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/calls')
      .query({ limit: '200', includeRecordingUrl: 'true' })
      .reply(200, {
        meta: {},
        calls: [
          {
            id: 'c1', contactNumber: '+1', startedAt: '2026-04-20T10:00:00Z',
            recipient: '200',
            directoryTarget: { displayName: 'Sales' },
            voicemail: { id: 'vm1', duration: 15, transcription: 'hello', recordingUrl: 'https://r/vm1.wav' },
          },
          { id: 'c2', contactNumber: '+2' }, // no voicemail field — skipped
        ],
      });
    const c = new SpokeApiClient({ active: profile });
    const arr = await voicemails.list(c);
    expect(arr).toHaveLength(1);
    expect(arr[0].id).toBe('vm1');
    expect(arr[0].callId).toBe('c1');
    expect(arr[0].from).toBe('+1');
    expect(arr[0].recipientName).toBe('Sales');
  });

  it('getByCallId fetches a call and returns its voicemail', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/calls/c1').query({ includeRecordingUrl: 'true' }).reply(200, {
      id: 'c1',
      voicemail: { id: 'vm1', duration: 15, transcription: 'hi' },
    });
    const c = new SpokeApiClient({ active: profile });
    expect((await voicemails.getByCallId(c, 'c1')).id).toBe('vm1');
  });

  it('getByCallId throws when call has no voicemail', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/calls/c1').query({ includeRecordingUrl: 'true' }).reply(200, { id: 'c1' });
    const c = new SpokeApiClient({ active: profile });
    await expect(voicemails.getByCallId(c, 'c1')).rejects.toThrow(/no voicemail/);
  });

  it('transcript returns the transcription string', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/calls/c1').query({ includeRecordingUrl: 'true' }).reply(200, {
      id: 'c1', voicemail: { id: 'vm1', transcription: 'hi there' },
    });
    const c = new SpokeApiClient({ active: profile });
    expect(await voicemails.transcript(c, 'c1')).toBe('hi there');
  });

  it('download writes the recording bytes to disk', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/calls/c1').query({ includeRecordingUrl: 'true' }).reply(200, {
      id: 'c1', voicemail: { id: 'vm1', recordingUrl: 'https://recordings.example/vm1.wav' },
    });
    nock('https://recordings.example').get('/vm1.wav').reply(200, Buffer.from('wavdata'));
    const out = path.join(os.tmpdir(), `spoke-vm-${Date.now()}.wav`);
    const c = new SpokeApiClient({ active: profile });
    await voicemails.download(c, 'c1', out);
    expect(fs.readFileSync(out).toString()).toBe('wavdata');
    fs.unlinkSync(out);
  });

  it('download throws when voicemail has no recordingUrl', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/calls/c1').query({ includeRecordingUrl: 'true' }).reply(200, {
      id: 'c1', voicemail: { id: 'vm1' },
    });
    const c = new SpokeApiClient({ active: profile });
    await expect(voicemails.download(c, 'c1', '/tmp/x')).rejects.toThrow(/recording/);
  });
});
