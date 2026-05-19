import { Command } from 'commander';
import { resolveActiveProfile } from '../../lib/auth/profiles';
import { readToken, isExpired } from '../../lib/auth/token-cache';
import { fetchToken } from '../../lib/auth/oauth';
import { logger } from '../../lib/logger';
import { AuthError } from '../../lib/errors';

export interface StatusOptions {
  profile?: string;
  showToken?: boolean;
}

export async function runStatus(opts: StatusOptions): Promise<void> {
  const active = resolveActiveProfile(opts.profile);
  let cached = readToken(active.name);
  let valid = cached !== null && !isExpired(cached);
  let acquired = false;
  if (!valid) {
    try {
      cached = await fetchToken(active);
      valid = true;
      acquired = true;
    } catch (err) {
      throw err instanceof AuthError ? err : new AuthError(String(err));
    }
  }
  const expMs = cached ? Math.max(0, cached.expires_at - Date.now()) : 0;
  const minutes = Math.round(expMs / 60_000);
  logger.info(`✓ Logged in to ${active.apiUrl} (profile: ${active.name})`);
  logger.info(`  Token: ${valid ? 'valid' : 'invalid'}${valid ? ` (expires in ${minutes}m)` : ''}`);
  if (active.tenant) logger.info(`  Tenant: ${active.tenant}`);
  if (acquired) logger.info(`  (Token freshly acquired.)`);
  if (opts.showToken && cached) {
    logger.info(`  Access Token: ${cached.access_token}`);
  }
}

export function statusCommand(parent: Command): void {
  parent
    .command('status')
    .description('Check current credentials and token status')
    .option('--show-token', 'Reveal the raw access token in output')
    .action(async function (this: Command, opts) {
      const merged = this.optsWithGlobals();
      await runStatus({ profile: merged.profile, showToken: opts.showToken });
    });
}
