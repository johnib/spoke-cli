import * as fs from 'node:fs';
import * as path from 'node:path';
import * as YAML from 'yaml';
import { getPaths } from '../config/paths';
import { DEFAULT_API_URL, DEFAULT_AUTH_URL } from '../env';
import { ValidationError } from '../errors';

export interface Profile {
  client_id: string;
  client_secret: string;
  api_url: string;
  auth_url: string;
  tenant?: string;
}

export interface ConfigFile {
  version: number;
  default_profile: string;
  output_format?: 'json' | 'table' | 'human';
  color?: boolean;
  profiles: Record<string, Profile>;
}

const EMPTY_CONFIG: ConfigFile = {
  version: 1,
  default_profile: 'default',
  output_format: 'table',
  color: true,
  profiles: {},
};

function ensureHome(env: NodeJS.ProcessEnv = process.env): string {
  const { home, tokensDir } = getPaths(env);
  fs.mkdirSync(home, { recursive: true, mode: 0o700 });
  fs.mkdirSync(tokensDir, { recursive: true, mode: 0o700 });
  return home;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): ConfigFile {
  const { configFile } = getPaths(env);
  if (!fs.existsSync(configFile)) {
    return { ...EMPTY_CONFIG, profiles: {} };
  }
  const raw = fs.readFileSync(configFile, 'utf8');
  const parsed = (YAML.parse(raw) ?? {}) as Partial<ConfigFile>;
  return {
    version: parsed.version ?? 1,
    default_profile: parsed.default_profile ?? 'default',
    output_format: parsed.output_format,
    color: parsed.color ?? true,
    profiles: parsed.profiles ?? {},
  };
}

export function writeConfig(cfg: ConfigFile, env: NodeJS.ProcessEnv = process.env): void {
  ensureHome(env);
  const { configFile } = getPaths(env);
  const yamlText = YAML.stringify(cfg);
  fs.writeFileSync(configFile, yamlText, { mode: 0o600 });
  // Force 0600 even if umask is permissive.
  fs.chmodSync(configFile, 0o600);
}

export interface SaveProfileOpts {
  name?: string;
  clientId: string;
  clientSecret: string;
  apiUrl?: string;
  authUrl?: string;
  tenant?: string;
}

export function saveProfile(opts: SaveProfileOpts, env: NodeJS.ProcessEnv = process.env): { name: string; profile: Profile } {
  const cfg = readConfig(env);
  const name = opts.name ?? 'default';
  const profile: Profile = {
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    api_url: opts.apiUrl ?? DEFAULT_API_URL,
    auth_url: opts.authUrl ?? DEFAULT_AUTH_URL,
    tenant: opts.tenant,
  };
  cfg.profiles[name] = profile;
  if (!cfg.default_profile || Object.keys(cfg.profiles).length === 1) {
    cfg.default_profile = name;
  }
  writeConfig(cfg, env);
  return { name, profile };
}

export function deleteProfile(name: string, env: NodeJS.ProcessEnv = process.env): boolean {
  const cfg = readConfig(env);
  if (!cfg.profiles[name]) return false;
  delete cfg.profiles[name];
  const remaining = Object.keys(cfg.profiles);
  if (cfg.default_profile === name) {
    cfg.default_profile = remaining[0] ?? 'default';
  }
  writeConfig(cfg, env);
  // Best-effort: remove cached token for this profile
  const tokenPath = path.join(getPaths(env).tokensDir, `${name}.json`);
  try {
    fs.rmSync(tokenPath, { force: true });
  } catch {
    /* ignore */
  }
  return true;
}

export function listProfiles(env: NodeJS.ProcessEnv = process.env): Record<string, Profile> {
  return readConfig(env).profiles;
}

/**
 * Resolves the active profile given CLI flags and env. Precedence:
 *   1. Explicit `flagProfile` (from --profile)
 *   2. SPOKE_PROFILE env var
 *   3. Config file's default_profile
 *   4. The literal string "default"
 *
 * Env credentials (SPOKE_CLIENT_ID/SECRET) override the profile's stored creds.
 */
export interface ActiveProfile {
  name: string;
  clientId: string;
  clientSecret: string;
  apiUrl: string;
  authUrl: string;
  tenant?: string;
  /** True when creds came purely from env, no profile in config. */
  ephemeral: boolean;
}

export function resolveActiveProfile(
  flagProfile?: string,
  env: NodeJS.ProcessEnv = process.env,
): ActiveProfile {
  const cfg = readConfig(env);
  const name = flagProfile ?? env.SPOKE_PROFILE ?? cfg.default_profile ?? 'default';
  const stored = cfg.profiles[name];

  const clientId = env.SPOKE_CLIENT_ID || stored?.client_id;
  const clientSecret = env.SPOKE_CLIENT_SECRET || stored?.client_secret;
  const apiUrl = env.SPOKE_API_URL || stored?.api_url || DEFAULT_API_URL;
  const authUrl = env.SPOKE_AUTH_URL || stored?.auth_url || DEFAULT_AUTH_URL;

  if (!clientId || !clientSecret) {
    throw new ValidationError(
      `no credentials for profile "${name}"`,
      'Run `spoke auth login` or set SPOKE_CLIENT_ID and SPOKE_CLIENT_SECRET.',
    );
  }

  return {
    name,
    clientId,
    clientSecret,
    apiUrl,
    authUrl,
    tenant: stored?.tenant,
    ephemeral: !stored,
  };
}
