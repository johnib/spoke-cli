import { Command } from 'commander';
import * as groups from '../../lib/api/groups';
import { formatList } from '../../lib/output/format';
import { globalOpts, makeClient } from '../_shared';

export async function runMembers(cmd: Command, idOrName: string, opts: { available?: boolean }): Promise<void> {
  const client = makeClient(cmd);
  const arr = await groups.members(client, idOrName, opts);
  await formatList(arr, {
    ...globalOpts(cmd),
    columns: [
      { header: 'EXTENSION', get: (m) => m.extension ?? m.id ?? '' },
      { header: 'NAME', get: (m) => m.displayName ?? '' },
      { header: 'STATUS', get: (m) => m.status ?? (m.available ? 'available' : 'unknown') },
    ],
  });
}

export function membersCommand(parent: Command): void {
  parent
    .command('members <idOrName>')
    .description('List members of a group')
    .option('--available', 'Only available members', false)
    .action(async function (this: Command, idOrName: string, opts) {
      await runMembers(this, idOrName, opts);
    });
}
