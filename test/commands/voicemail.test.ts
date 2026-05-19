import nock from 'nock';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { runCli } from '../helpers/run-cli';
import { setupTmpHome, TmpHome } from '../helpers/tmp-home';
import { disableRealNetwork, restoreNetwork, mockTokenEndpoint } from '../helpers/nock-setup';

describe('spoke voicemail commands (derived from /calls)', () => {
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

  it('list filters /calls to voicemail-bearing entries', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/calls')
      .query({ limit: '200', includeRecordingUrl: 'true' })
      .reply(200, {
        meta: {},
        calls: [
          {
            id: 'c1', contactNumber: '+1', startedAt: '2026-04-20T08:41:32.751Z',
            directoryTarget: { displayName: 'Sales' },
            voicemail: { id: 'vm1', duration: 15, transcription: 'hello' },
          },
        ],
      });
    const r = await runCli(['voicemail', 'list']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('vm1');
    expect(r.stdout).toContain('Sales');
  });

  it('get by call id', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/calls/c1')
      .query({ includeRecordingUrl: 'true' })
      .reply(200, {
        id: 'c1', contactNumber: '+1',
        voicemail: { id: 'vm1', duration: 15, transcription: 'hello' },
      });
    const r = await runCli(['voicemail', 'get', 'c1']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('vm1');
    expect(r.stdout).toContain('hello');
  });

  it('transcript prints the transcription', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/calls/c1')
      .query({ includeRecordingUrl: 'true' })
      .reply(200, { id: 'c1', voicemail: { id: 'vm1', transcription: 'Hi Alice...' } });
    const r = await runCli(['voicemail', 'transcript', 'c1']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('Hi Alice');
  });

  it('download writes the recording', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/calls/c1')
      .query({ includeRecordingUrl: 'true' })
      .reply(200, { id: 'c1', voicemail: { id: 'vm1', recordingUrl: 'https://r.example/vm1.wav' } });
    nock('https://r.example').get('/vm1.wav').reply(200, Buffer.from('audio'));
    const out = path.join(os.tmpdir(), `vm-${Date.now()}.wav`);
    const r = await runCli(['voicemail', 'download', 'c1', '--output', out]);
    expect(r.exitCode).toBe(0);
    expect(fs.readFileSync(out).toString()).toBe('audio');
    fs.unlinkSync(out);
  });
});
