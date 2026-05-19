import { Command } from 'commander';
import * as messages from '../../lib/api/messages';
import { formatList } from '../../lib/output/format';
import { globalOpts, makeClient } from '../_shared';

export async function runList(cmd: Command, opts: {
  direction?: string;
  user?: string;
  channel?: string;
  since?: string;
  limit?: number;
}): Promise<void> {
  const client = makeClient(cmd);
  const arr = await messages.list(client, {
    direction: opts.direction as any,
    user: opts.user,
    channel: opts.channel as any,
    since: opts.since,
    limit: opts.limit,
  });
  await formatList(arr, {
    ...globalOpts(cmd),
    columns: [
      { header: 'ID', get: (m) => m.id ?? '' },
      { header: 'DIR', get: (m) => m.direction ?? '' },
      { header: 'FROM', get: (m) => m.from ?? '' },
      { header: 'TO', get: (m) => m.to ?? '' },
      { header: 'CHANNEL', get: (m) => m.channel ?? '' },
      { header: 'BODY', get: (m) => (m.body ?? '').slice(0, 40) },
    ],
  });
}

export function listCommand(parent: Command): void {
  parent
    .command('list')
    .description('List messages')
    .option('--direction <dir>', 'inbound | outbound')
    .option('--user <id>', 'Filter by user id or extension')
    .option('--channel <ch>', 'sms | whatsapp')
    .option('--since <date>', 'ISO date lower bound')
    .option('--limit <n>', 'Items per page', (v) => parseInt(v, 10))
    .action(async function (this: Command, opts) {
      await runList(this, opts);
    });
}
