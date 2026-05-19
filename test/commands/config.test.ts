import { runCli } from '../helpers/run-cli';
import { setupTmpHome, TmpHome } from '../helpers/tmp-home';
import { saveProfile } from '../../src/lib/auth/profiles';

describe('spoke config commands', () => {
  let tmp: TmpHome;
  beforeEach(() => {
    tmp = setupTmpHome();
  });
  afterEach(() => tmp.cleanup());

  it('set + get round-trip', async () => {
    saveProfile({ clientId: 'a', clientSecret: 'b' });
    const set = await runCli(['config', 'set', 'output_format', 'json']);
    expect(set.exitCode).toBe(0);
    const get = await runCli(['config', 'get', 'output_format']);
    expect(get.exitCode).toBe(0);
    expect(get.stdout.trim()).toBe('json');
  });

  it('list prints all settings', async () => {
    saveProfile({ clientId: 'a', clientSecret: 'b' });
    const result = await runCli(['config', 'list']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('default_profile');
  });

  it('rejects unknown key on get', async () => {
    const result = await runCli(['config', 'get', 'bogus']);
    expect(result.exitCode).toBe(1);
  });
});
