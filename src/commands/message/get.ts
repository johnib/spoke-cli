import { Command } from 'commander';
import * as messages from '../../lib/api/messages';
import { formatItem } from '../../lib/output/format';
import { globalOpts, makeClient } from '../_shared';

export async function runGet(cmd: Command, id: string): Promise<void> {
  const client = makeClient(cmd);
  const m = await messages.get(client, id);
  await formatItem(m, {
    ...globalOpts(cmd),
    fields: [
      { label: 'ID', get: (x) => x.id ?? id },
      { label: 'Direction', get: (x) => x.direction ?? '' },
      { label: 'From', get: (x) => x.from ?? '' },
      { label: 'To', get: (x) => x.to ?? '' },
      { label: 'Channel', get: (x) => x.channel ?? '' },
      { label: 'Status', get: (x) => x.status ?? '' },
      { label: 'Body', get: (x) => x.body ?? '' },
    ],
  });
}

export function getCommand(parent: Command): void {
  parent
    .command('get <id>')
    .description('Get a single message')
    .action(async function (this: Command, id: string) {
      await runGet(this, id);
    });
}
