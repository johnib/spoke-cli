import { Command } from 'commander';
import * as groups from '../../lib/api/groups';
import { formatList } from '../../lib/output/format';
import { globalOpts, makeClient } from '../_shared';

export async function runList(cmd: Command, opts: { available?: boolean; hidden?: boolean; limit?: number }): Promise<void> {
  const client = makeClient(cmd);
  const arr = await groups.list(client, opts);
  await formatList(arr, {
    ...globalOpts(cmd),
    columns: [
      { header: 'EXTENSION', get: (g) => g.extension ?? '' },
      { header: 'NAME', get: (g) => g.displayName ?? '' },
      { header: 'MEMBERS', get: (g) => g.availability?.totalMembers ?? (g.teamMembers ?? []).length },
      {
        header: 'AVAILABLE',
        get: (g) =>
          g.availability?.totalAvailable ??
          (g.teamMembers ?? []).filter((m) => m.availability?.status === 'available').length,
      },
      { header: 'STATUS', get: (g) => g.availability?.status ?? '' },
    ],
  });
}

export function listCommand(parent: Command): void {
  parent
    .command('list')
    .description('List call groups (teams)')
    .option('--available', 'Groups with at least one available member', false)
    .option('--hidden', 'Include hidden groups', false)
    .option('--limit <n>', 'Items per page', (v) => parseInt(v, 10))
    .action(async function (this: Command, opts) {
      await runList(this, opts);
    });
}
