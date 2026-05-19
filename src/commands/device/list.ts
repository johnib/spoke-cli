import { Command } from 'commander';
import * as devices from '../../lib/api/devices';
import { formatList } from '../../lib/output/format';
import { globalOpts, makeClient } from '../_shared';

export async function runList(cmd: Command, opts: { user?: string; type?: string; active?: boolean }): Promise<void> {
  const client = makeClient(cmd);
  const arr = await devices.list(client, opts);
  await formatList(arr, {
    ...globalOpts(cmd),
    columns: [
      { header: 'ID', get: (d) => d.id },
      { header: 'USER', get: (d) => d.userName ?? d.userId ?? '' },
      { header: 'TYPE', get: (d) => d.type ?? '' },
      { header: 'PLATFORM', get: (d) => d.platform ?? '' },
      { header: 'STATUS', get: (d) => d.status ?? (d.active ? 'active' : 'idle') },
    ],
  });
}

export function listCommand(parent: Command): void {
  parent
    .command('list')
    .description('List registered devices')
    .option('--user <id>', 'Filter by user id or name')
    .option('--type <type>', 'Filter by device type (mobile, desktop, deskphone)')
    .option('--active', 'Only currently active devices', false)
    .action(async function (this: Command, opts) {
      await runList(this, opts);
    });
}
