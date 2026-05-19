import * as fs from 'node:fs';
import { setupTmpHome, TmpHome } from '../../helpers/tmp-home';
import {
  readConfig,
  writeConfig,
  saveProfile,
  deleteProfile,
  listProfiles,
  resolveActiveProfile,
} from '../../../src/lib/auth/profiles';
import { ValidationError } from '../../../src/lib/errors';

describe('auth/profiles', () => {
  let tmp: TmpHome;
  beforeEach(() => {
    tmp = setupTmpHome();
  });
  afterEach(() => tmp.cleanup());

  it('returns an empty config when no file exists', () => {
    const cfg = readConfig();
    expect(cfg.profiles).toEqual({});
    expect(cfg.default_profile).toBe('default');
  });

  it('saves and reads a profile', () => {
    saveProfile({ name: 'prod', clientId: 'cid', clientSecret: 'sec' });
    const cfg = readConfig();
    expect(cfg.profiles.prod.client_id).toBe('cid');
    expect(cfg.default_profile).toBe('prod'); // first profile becomes default
  });

  it('preserves existing default_profile when adding additional profiles', () => {
    saveProfile({ name: 'one', clientId: 'a', clientSecret: 'b' });
    saveProfile({ name: 'two', clientId: 'c', clientSecret: 'd' });
    expect(readConfig().default_profile).toBe('one');
  });

  it('writes config file with 0600 perms', () => {
    saveProfile({ clientId: 'x', clientSecret: 'y' });
    const path = `${tmp.home}/config.yml`;
    const mode = fs.statSync(path).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it('deletes a profile and updates default_profile', () => {
    saveProfile({ name: 'one', clientId: 'a', clientSecret: 'b' });
    saveProfile({ name: 'two', clientId: 'c', clientSecret: 'd' });
    expect(deleteProfile('one')).toBe(true);
    const cfg = readConfig();
    expect(cfg.profiles.one).toBeUndefined();
    expect(cfg.default_profile).toBe('two');
  });

  it('deleteProfile returns false for unknown profile', () => {
    expect(deleteProfile('nope')).toBe(false);
  });

  it('listProfiles returns the profiles map', () => {
    saveProfile({ name: 'a', clientId: 'i', clientSecret: 's' });
    expect(Object.keys(listProfiles())).toEqual(['a']);
  });

  it('resolveActiveProfile uses --profile flag when given', () => {
    saveProfile({ name: 'staging', clientId: 'sc', clientSecret: 'ss' });
    const active = resolveActiveProfile('staging');
    expect(active.name).toBe('staging');
    expect(active.clientId).toBe('sc');
  });

  it('resolveActiveProfile falls back to SPOKE_PROFILE env var', () => {
    saveProfile({ name: 'prod', clientId: 'pc', clientSecret: 'ps' });
    const env = { ...process.env, SPOKE_PROFILE: 'prod' } as NodeJS.ProcessEnv;
    expect(resolveActiveProfile(undefined, env).name).toBe('prod');
  });

  it('resolveActiveProfile uses env creds without a stored profile', () => {
    const env = {
      ...process.env,
      SPOKE_HOME: tmp.home,
      SPOKE_CLIENT_ID: 'envid',
      SPOKE_CLIENT_SECRET: 'envsec',
    } as NodeJS.ProcessEnv;
    const active = resolveActiveProfile(undefined, env);
    expect(active.clientId).toBe('envid');
    expect(active.ephemeral).toBe(true);
  });

  it('resolveActiveProfile throws ValidationError without credentials', () => {
    expect(() => resolveActiveProfile()).toThrow(ValidationError);
  });

  it('writeConfig replaces existing file', () => {
    saveProfile({ clientId: 'x', clientSecret: 'y' });
    const cfg = readConfig();
    cfg.color = false;
    writeConfig(cfg);
    expect(readConfig().color).toBe(false);
  });
});
