import nock from 'nock';
import { runCli } from '../helpers/run-cli';
import { setupTmpHome, TmpHome } from '../helpers/tmp-home';
import { disableRealNetwork, restoreNetwork, mockTokenEndpoint } from '../helpers/nock-setup';

describe('spoke call commands', () => {
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

  it('list prints calls with ms→HH:MM:SS duration', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/calls')
      .query({ includeActive: 'true' })
      .reply(200, {
        meta: {},
        calls: [{
          id: 'c1', direction: 'inbound',
          contactNumber: '+447723497939', companyNumber: '+13186598411',
          directoryTarget: { displayName: 'UK Finance Co-Ordinators' },
          outcome: { status: 'answered' }, duration: 16976,
          startedAt: '2026-04-16T10:04:13.311Z',
        }],
      });
    const r = await runCli(['call', 'list']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('inbound');
    expect(r.stdout).toContain('+447723497939');
    expect(r.stdout).toContain('UK Finance Co-Ordinators');
    expect(r.stdout).toContain('00:00:16');
    expect(r.stdout).toContain('2026-04-16 10:04:13');
  });

  it('get prints call details', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/calls/c1').reply(200, {
      id: 'c1', direction: 'inbound', status: 'accepted', outcome: { status: 'answered' },
      duration: 16976, waitTime: 12689,
      assignedUser: { firstName: 'Konstantin', lastName: 'Stepanov' },
    });
    const r = await runCli(['call', 'get', 'c1']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('answered');
    expect(r.stdout).toContain('Konstantin Stepanov');
  });

  it('twiml-url builds the canonical URL', async () => {
    const r = await runCli(['call', 'twiml-url', '--extension', '101', '--organisation-id', 'org-1']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('api.spokephone.com/telephony/redirect');
    expect(r.stdout).toContain('extension=101');
    expect(r.stdout).toContain('organisationId=org-1');
  });

  it('twiml-url omits --send-to-voicemail when not passed', async () => {
    const r = await runCli(['call', 'twiml-url', '--extension', '101']);
    expect(r.stdout).not.toContain('sendToVoicemail');
  });

  it('twiml-url includes returnTo + returnToId', async () => {
    const r = await runCli([
      'call', 'twiml-url',
      '--extension', '101',
      '--return-to', 'flow',
      '--return-to-id', 'FW-1',
    ]);
    expect(r.stdout).toContain('returnTo=flow');
    expect(r.stdout).toContain('returnToId=FW-1');
  });
});
