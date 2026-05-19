import { Command } from 'commander';
import * as calls from '../../lib/api/calls';
import { logger } from '../../lib/logger';
import { ValidationError } from '../../lib/errors';
import { makeClient } from '../_shared';

export async function runRedirect(cmd: Command, sid: string, opts: { to?: string }): Promise<void> {
  if (!opts.to) throw new ValidationError('--to is required');
  const client = makeClient(cmd);
  const isNumber = opts.to.startsWith('+');
  await calls.redirect(client, sid, {
    extension: isNumber ? undefined : opts.to,
    number: isNumber ? opts.to : undefined,
  });
  logger.info(`✓ Redirected ${sid} to ${opts.to}.`);
}

export function redirectCommand(parent: Command): void {
  parent
    .command('redirect <sid>')
    .description('Redirect an unanswered call')
    .requiredOption('--to <ext>', 'Destination extension or +E164 number')
    .action(async function (this: Command, sid: string, opts) {
      await runRedirect(this, sid, opts);
    });
}
