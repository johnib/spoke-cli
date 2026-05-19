import { Command } from 'commander';
import * as voicemails from '../../lib/api/voicemails';
import { formatList } from '../../lib/output/format';
import { globalOpts, makeClient } from '../_shared';

export async function runList(cmd: Command, opts: { user?: string; group?: string; unread?: boolean; limit?: number }): Promise<void> {
  const client = makeClient(cmd);
  const arr = await voicemails.list(client, opts);
  await formatList(arr, {
    ...globalOpts(cmd),
    columns: [
      { header: 'ID', get: (v) => v.id ?? '' },
      { header: 'RECIPIENT', get: (v) => v.recipientName ?? v.recipientId ?? '' },
      { header: 'FROM', get: (v) => v.from ?? '' },
      { header: 'DURATION', get: (v) => v.duration ?? 0 },
      { header: 'RECEIVED', get: (v) => v.receivedAt ?? '' },
      { header: 'READ', get: (v) => (v.read ? 'yes' : 'no') },
    ],
  });
}

export function listCommand(parent: Command): void {
  parent
    .command('list')
    .description('List voicemails')
    .option('--user <id>', 'Filter by user')
    .option('--group <id>', 'Filter by group')
    .option('--unread', 'Only unread', false)
    .option('--limit <n>', 'Items per page', (v) => parseInt(v, 10))
    .action(async function (this: Command, opts) {
      await runList(this, opts);
    });
}
