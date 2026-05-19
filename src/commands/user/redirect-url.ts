import { Command } from 'commander';
import * as users from '../../lib/api/users';
import { logger } from '../../lib/logger';

export function runRedirectUrl(id: string, opts: { returnTo?: string }): void {
  const url = users.redirectUrl(id, opts.returnTo);
  logger.info(url);
}

export function redirectUrlCommand(parent: Command): void {
  parent
    .command('redirect-url <id>')
    .description('Get the TwiML redirect URL for a user')
    .option('--return-to <url>', 'Fallback Studio URL')
    .action((id: string, opts) => runRedirectUrl(id, opts));
}
