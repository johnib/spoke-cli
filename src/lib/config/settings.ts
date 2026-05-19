import { readConfig, writeConfig, ConfigFile } from '../auth/profiles';
import { ValidationError } from '../errors';

/**
 * Known top-level config keys that `spoke config set` accepts.
 *
 * `api_url` and `auth_url` are stored per-profile, but for convenience we let
 * the user set them on the active profile via this command too. That's
 * handled by setSetting.
 */
export const KNOWN_KEYS = [
  'default_profile',
  'output_format',
  'color',
  'api_url',
  'auth_url',
] as const;
export type ConfigKey = (typeof KNOWN_KEYS)[number];

export function getSetting(key: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const cfg = readConfig(env);
  switch (key) {
    case 'default_profile':
      return cfg.default_profile;
    case 'output_format':
      return cfg.output_format;
    case 'color':
      return cfg.color === undefined ? undefined : String(cfg.color);
    case 'api_url': {
      const p = cfg.profiles[cfg.default_profile];
      return p?.api_url;
    }
    case 'auth_url': {
      const p = cfg.profiles[cfg.default_profile];
      return p?.auth_url;
    }
    default:
      throw new ValidationError(`unknown config key "${key}"`, `Known keys: ${KNOWN_KEYS.join(', ')}`);
  }
}

export function setSetting(key: string, value: string, env: NodeJS.ProcessEnv = process.env): void {
  const cfg = readConfig(env);
  switch (key) {
    case 'default_profile':
      if (!cfg.profiles[value]) {
        throw new ValidationError(`profile "${value}" does not exist`);
      }
      cfg.default_profile = value;
      break;
    case 'output_format':
      if (value !== 'json' && value !== 'table' && value !== 'human') {
        throw new ValidationError(`output_format must be json|table|human`);
      }
      cfg.output_format = value;
      break;
    case 'color':
      cfg.color = value === 'true' || value === '1' || value === 'yes';
      break;
    case 'api_url':
    case 'auth_url': {
      const profileName = cfg.default_profile ?? 'default';
      const existing = cfg.profiles[profileName];
      if (!existing) {
        throw new ValidationError(
          `no active profile to update; run \`spoke auth login\` first`,
        );
      }
      existing[key] = value;
      break;
    }
    default:
      throw new ValidationError(`unknown config key "${key}"`, `Known keys: ${KNOWN_KEYS.join(', ')}`);
  }
  writeConfig(cfg, env);
}

export function listSettings(env: NodeJS.ProcessEnv = process.env): Record<string, string | undefined> {
  const cfg = readConfig(env);
  const active = cfg.profiles[cfg.default_profile];
  return {
    default_profile: cfg.default_profile,
    output_format: cfg.output_format,
    color: cfg.color === undefined ? undefined : String(cfg.color),
    api_url: active?.api_url,
    auth_url: active?.auth_url,
  };
}

export function dumpConfig(env: NodeJS.ProcessEnv = process.env): ConfigFile {
  return readConfig(env);
}
