import { setupTmpHome, TmpHome } from '../../helpers/tmp-home';
import { saveProfile } from '../../../src/lib/auth/profiles';
import {
  getSetting,
  setSetting,
  listSettings,
  dumpConfig,
  KNOWN_KEYS,
} from '../../../src/lib/config/settings';
import { ValidationError } from '../../../src/lib/errors';

describe('config/settings', () => {
  let tmp: TmpHome;
  beforeEach(() => {
    tmp = setupTmpHome();
  });
  afterEach(() => tmp.cleanup());

  it('lists known keys constant', () => {
    expect(KNOWN_KEYS).toContain('default_profile');
    expect(KNOWN_KEYS).toContain('output_format');
    expect(KNOWN_KEYS).toContain('color');
  });

  it('reads default_profile / output_format / color', () => {
    saveProfile({ name: 'default', clientId: 'a', clientSecret: 'b' });
    setSetting('output_format', 'json');
    setSetting('color', 'false');
    expect(getSetting('output_format')).toBe('json');
    expect(getSetting('color')).toBe('false');
    expect(getSetting('default_profile')).toBe('default');
  });

  it('throws on unknown key for get', () => {
    expect(() => getSetting('bogus')).toThrow(ValidationError);
  });

  it('throws on unknown key for set', () => {
    expect(() => setSetting('bogus', 'x')).toThrow(ValidationError);
  });

  it('rejects setting default_profile to nonexistent profile', () => {
    expect(() => setSetting('default_profile', 'absent')).toThrow(ValidationError);
  });

  it('rejects invalid output_format', () => {
    saveProfile({ clientId: 'a', clientSecret: 'b' });
    expect(() => setSetting('output_format', 'silly')).toThrow(ValidationError);
  });

  it('updates default_profile when target exists', () => {
    saveProfile({ name: 'default', clientId: 'a', clientSecret: 'b' });
    saveProfile({ name: 'prod', clientId: 'c', clientSecret: 'd' });
    setSetting('default_profile', 'prod');
    expect(getSetting('default_profile')).toBe('prod');
  });

  it('updates api_url on active profile', () => {
    saveProfile({ clientId: 'a', clientSecret: 'b' });
    setSetting('api_url', 'https://x.example');
    expect(getSetting('api_url')).toBe('https://x.example');
  });

  it('rejects api_url update without active profile', () => {
    expect(() => setSetting('api_url', 'https://x')).toThrow(ValidationError);
  });

  it('listSettings returns combined view', () => {
    saveProfile({ clientId: 'a', clientSecret: 'b', apiUrl: 'https://api.x' });
    const all = listSettings();
    expect(all.default_profile).toBe('default');
    expect(all.api_url).toBe('https://api.x');
  });

  it('dumpConfig returns the full config', () => {
    saveProfile({ clientId: 'a', clientSecret: 'b' });
    const cfg = dumpConfig();
    expect(cfg.profiles.default.client_id).toBe('a');
  });

  it('coerces color strings to bool', () => {
    saveProfile({ clientId: 'a', clientSecret: 'b' });
    setSetting('color', 'true');
    expect(getSetting('color')).toBe('true');
    setSetting('color', '0');
    expect(getSetting('color')).toBe('false');
  });
});
