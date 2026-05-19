import { Command } from 'commander';
import * as devices from '../../lib/api/devices';
import { formatItem } from '../../lib/output/format';
import { globalOpts, makeClient } from '../_shared';

export async function runGet(cmd: Command, id: string): Promise<void> {
  const client = makeClient(cmd);
  const d = await devices.get(client, id);
  await formatItem(d, {
    ...globalOpts(cmd),
    fields: [
      { label: 'ID', get: (x) => x.id },
      { label: 'User', get: (x) => x.userName ?? x.userId ?? '' },
      { label: 'Type', get: (x) => x.type ?? '' },
      { label: 'Platform', get: (x) => x.platform ?? '' },
      { label: 'Status', get: (x) => x.status ?? (x.active ? 'active' : 'idle') },
    ],
  });
}

export function getCommand(parent: Command): void {
  parent
    .command('get <id>')
    .description('Get a single device')
    .action(async function (this: Command, id: string) {
      await runGet(this, id);
    });
}
