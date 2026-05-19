import { Command } from 'commander';
import * as devices from '../../lib/api/devices';
import { formatList } from '../../lib/output/format';
import { globalOpts, makeClient } from '../_shared';

export async function runList(cmd: Command, opts: { user?: string; type?: 'device' | 'trunkDevice' }): Promise<void> {
  const client = makeClient(cmd);
  const arr = await devices.list(client, opts);
  await formatList(arr, {
    ...globalOpts(cmd),
    columns: [
      { header: 'ID', get: (d) => d.id ?? '' },
      { header: 'NAME', get: (d) => d.displayName ?? '' },
      { header: 'TYPE', get: (d) => d.type ?? '' },
      { header: 'EXTENSION', get: (d) => d.extension ?? '' },
    ],
  });
}

export function listCommand(parent: Command): void {
  parent
    .command('list')
    .description('List devices (directory entries with type=device)')
    .option('--user <name>', 'Filter by user display name / email substring')
    .option('--type <type>', 'device | trunkDevice', 'device')
    .action(async function (this: Command, opts) {
      await runList(this, opts);
    });
}
