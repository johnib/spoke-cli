import * as fs from 'node:fs';
import { tokenFile, getPaths } from '../config/paths';

export interface CachedToken {
  access_token: string;
  /** Unix epoch milliseconds when this token expires. */
  expires_at: number;
  token_type: string;
}

const SAFETY_WINDOW_MS = 60_000; // refresh ~60s before actual expiry

export function readToken(profile: string, env: NodeJS.ProcessEnv = process.env): CachedToken | null {
  const file = tokenFile(profile, env);
  if (!fs.existsSync(file)) return null;
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw) as CachedToken;
    if (typeof parsed.access_token !== 'string') return null;
    if (typeof parsed.expires_at !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeToken(profile: string, token: CachedToken, env: NodeJS.ProcessEnv = process.env): void {
  const { tokensDir } = getPaths(env);
  fs.mkdirSync(tokensDir, { recursive: true, mode: 0o700 });
  const file = tokenFile(profile, env);
  fs.writeFileSync(file, JSON.stringify(token), { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

export function clearToken(profile: string, env: NodeJS.ProcessEnv = process.env): void {
  try {
    fs.rmSync(tokenFile(profile, env), { force: true });
  } catch {
    /* ignore */
  }
}

export function isExpired(token: CachedToken, now = Date.now()): boolean {
  return token.expires_at - now <= SAFETY_WINDOW_MS;
}
