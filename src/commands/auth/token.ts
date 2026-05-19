import { Command } from 'commander';
import { resolveActiveProfile } from '../../lib/auth/profiles';
import { getToken } from '../../lib/auth/oauth';
import { logger } from '../../lib/logger';

export interface TokenOptions {
  profile?: string;
}

export async function runToken(opts: TokenOptions): Promise<void> {
  const active = resolveActiveProfile(opts.profile);
  const tok = await getToken(active);
  logger.info(tok);
}

export function tokenCommand(parent: Command): void {
  parent
    .command('token')
    .description('Print the current access token')
    .action(async function (this: Command) {
      const merged = this.optsWithGlobals();
      await runToken({ profile: merged.profile });
    });
}
