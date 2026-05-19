import nock from 'nock';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { runCli } from '../helpers/run-cli';
import { setupTmpHome, TmpHome } from '../helpers/tmp-home';
import { disableRealNetwork, restoreNetwork, mockTokenEndpoint } from '../helpers/nock-setup';

describe('spoke voicemail commands', () => {
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

  it('list prints voicemails', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/voicemails').reply(200, [
      { id: 'vm1', from: '+1', duration: 43, read: false, recipientName: 'Alice' },
    ]);
    const result = await runCli(['voicemail', 'list']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('vm1');
  });

  it('get prints details', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/voicemails/vm1').reply(200, {
      id: 'vm1', from: '+1', duration: 30,
    });
    const result = await runCli(['voicemail', 'get', 'vm1']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('vm1');
  });

  it('transcript prints the transcription', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/voicemails/vm1').reply(200, {
      id: 'vm1', transcript: 'Hi Alice, this is John.',
    });
    const result = await runCli(['voicemail', 'transcript', 'vm1']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Hi Alice');
  });

  it('download writes file', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/voicemails/vm1').reply(200, {
      id: 'vm1', recordingUrl: 'https://recordings.example/vm1.mp3',
    });
    nock('https://recordings.example').get('/vm1.mp3').reply(200, Buffer.from('mp3data'));
    const out = path.join(os.tmpdir(), `spoke-cli-vm-${Date.now()}.mp3`);
    const result = await runCli(['voicemail', 'download', 'vm1', '--output', out]);
    expect(result.exitCode).toBe(0);
    expect(fs.readFileSync(out, 'utf8')).toBe('mp3data');
    fs.unlinkSync(out);
  });
});
