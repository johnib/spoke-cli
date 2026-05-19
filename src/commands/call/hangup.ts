import { Command } from 'commander';
import * as calls from '../../lib/api/calls';
import { logger } from '../../lib/logger';
import { makeClient } from '../_shared';

export async function runHangup(cmd: Command, sid: string): Promise<void> {
  const client = makeClient(cmd);
  await calls.hangup(client, sid);
  logger.info(`✓ Hung up ${sid}.`);
}

export function hangupCommand(parent: Command): void {
  parent
    .command('hangup <sid>')
    .description('Hang up a live call')
    .action(async function (this: Command, sid: string) {
      await runHangup(this, sid);
    });
}
