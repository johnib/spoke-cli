import { Command } from 'commander';
import * as webhooks from '../../lib/api/webhooks';
import { logger } from '../../lib/logger';
import { makeClient } from '../_shared';

export async function runDelete(cmd: Command, id: string, opts: { confirm?: boolean }): Promise<void> {
  if (!opts.confirm) {
    logger.info(`Refusing to delete webhook ${id} without --confirm. (Re-run with --confirm to proceed.)`);
    return;
  }
  const client = makeClient(cmd);
  await webhooks.remove(client, id);
  logger.info(`✓ Deleted webhook ${id}.`);
}

export function deleteCommand(parent: Command): void {
  parent
    .command('delete <id>')
    .description('Delete a webhook')
    .option('--confirm', 'Skip the safety prompt', false)
    .action(async function (this: Command, id: string, opts) {
      await runDelete(this, id, opts);
    });
}
