import { Command } from 'commander';
import * as groups from '../../lib/api/groups';
import { logger } from '../../lib/logger';

export function runRedirectUrl(id: string, opts: { returnTo?: string }): void {
  logger.info(groups.redirectUrl(id, opts.returnTo));
}

export function redirectUrlCommand(parent: Command): void {
  parent
    .command('redirect-url <id>')
    .description('Get the TwiML redirect URL for a group')
    .option('--return-to <url>', 'Fallback Studio URL')
    .action((id: string, opts) => runRedirectUrl(id, opts));
}
