import * as fs from 'node:fs';
import nock from 'nock';
import { runCli } from '../helpers/run-cli';
import { setupTmpHome, TmpHome } from '../helpers/tmp-home';
import { disableRealNetwork, restoreNetwork, mockTokenEndpoint, mockTokenEndpointFailure } from '../helpers/nock-setup';

describe('spoke auth commands', () => {
  let tmp: TmpHome;
  beforeAll(() => disableRealNetwork());
  afterAll(() => restoreNetwork());
  beforeEach(() => {
    tmp = setupTmpHome();
    nock.cleanAll();
    delete process.env.SPOKE_CLIENT_ID;
    delete process.env.SPOKE_CLIENT_SECRET;
  });
  afterEach(() => tmp.cleanup());

  describe('login', () => {
    it('saves a profile and validates credentials', async () => {
      mockTokenEndpoint();
      const result = await runCli([
        'auth', 'login',
        '--client-id', 'cid',
        '--client-secret', 'sec',
        '--profile', 'default',
      ]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Saved profile');
      // Profile is written to disk
      const cfg = fs.readFileSync(`${tmp.home}/config.yml`, 'utf8');
      expect(cfg).toContain('client_id: cid');
    });

    it('exits 2 when credentials are rejected', async () => {
      mockTokenEndpointFailure(401);
      const result = await runCli([
        'auth', 'login',
        '--client-id', 'bad',
        '--client-secret', 'bad',
      ]);
      expect(result.exitCode).toBe(2);
      expect(result.stderr.toLowerCase()).toContain('rejected');
    });

    it('exits 1 when client id/secret missing in non-interactive mode', async () => {
      const result = await runCli(['auth', 'login', '--no-prompt']);
      expect(result.exitCode).toBe(1);
    });
  });

  describe('logout', () => {
    it('removes a saved profile', async () => {
      mockTokenEndpoint({ persistent: true });
      await runCli(['auth', 'login', '--client-id', 'cid', '--client-secret', 'sec']);
      const result = await runCli(['auth', 'logout']);
      expect(result.exitCode).toBe(0);
    });

    it('exits 3 for missing profile', async () => {
      const result = await runCli(['auth', 'logout', '--profile', 'absent']);
      expect(result.exitCode).toBe(3);
    });
  });

  describe('status', () => {
    it('reports valid token', async () => {
      mockTokenEndpoint({ persistent: true });
      await runCli(['auth', 'login', '--client-id', 'cid', '--client-secret', 'sec']);
      const result = await runCli(['auth', 'status']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Logged in');
      expect(result.stdout).toContain('Token: valid');
    });
  });

  describe('token', () => {
    it('prints the bearer token', async () => {
      mockTokenEndpoint({ persistent: true });
      await runCli(['auth', 'login', '--client-id', 'cid', '--client-secret', 'sec']);
      const result = await runCli(['auth', 'token']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('test-access-token-abc123');
    });
  });

  describe('profiles', () => {
    it('lists saved profiles', async () => {
      mockTokenEndpoint({ persistent: true });
      await runCli(['auth', 'login', '--client-id', 'cid', '--client-secret', 'sec', '--profile', 'default']);
      await runCli(['auth', 'login', '--client-id', 'cid2', '--client-secret', 'sec2', '--profile', 'prod']);
      const result = await runCli(['auth', 'profiles']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('default');
      expect(result.stdout).toContain('prod');
    });
  });
});
