import { Command } from 'commander';
import * as calls from '../../lib/api/calls';
import { logger } from '../../lib/logger';
import { ValidationError } from '../../lib/errors';
import { globalOpts, makeClient } from '../_shared';

export async function runTransfer(cmd: Command, sid: string, opts: { to?: string; warm?: boolean; announce?: string }): Promise<void> {
  if (!opts.to) throw new ValidationError('--to is required');
  const client = makeClient(cmd);
  const isNumber = opts.to.startsWith('+');
  const result = await calls.redirect(client, sid, {
    extension: isNumber ? undefined : opts.to,
    number: isNumber ? opts.to : undefined,
    passthrough: opts.announce ? { announce: opts.announce } : undefined,
  });
  const mode = opts.warm ? 'warm/consult' : 'blind';
  logger.info(`✓ ${mode} transfer of ${sid} to ${opts.to} requested.`);
  if ((globalOpts(cmd) as any).json) {
    logger.info(JSON.stringify(result, null, 2));
  }
}

export function transferCommand(parent: Command): void {
  parent
    .command('transfer <sid>')
    .description('Transfer an active call')
    .requiredOption('--to <ext>', 'Destination extension or +E164 number')
    .option('--warm', 'Warm/consult transfer (caller speaks to target first)', false)
    .option('--announce <text>', 'Announce text shown to target')
    .action(async function (this: Command, sid: string, opts) {
      await runTransfer(this, sid, opts);
    });
}
