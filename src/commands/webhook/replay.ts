import { Command } from 'commander';
import * as webhooks from '../../lib/api/webhooks';
import { logger } from '../../lib/logger';
import { ValidationError } from '../../lib/errors';
import { makeClient } from '../_shared';

export async function runReplay(cmd: Command, id: string, opts: { eventId?: string }): Promise<void> {
  if (!opts.eventId) throw new ValidationError('--event-id is required');
  const client = makeClient(cmd);
  await webhooks.replay(client, id, opts.eventId);
  logger.info(`✓ Replayed event ${opts.eventId} to webhook ${id}.`);
}

export function replayCommand(parent: Command): void {
  parent
    .command('replay <id>')
    .description('Re-deliver a webhook event')
    .requiredOption('--event-id <id>', 'Event id to replay')
    .action(async function (this: Command, id: string, opts) {
      await runReplay(this, id, opts);
    });
}
