import { Command } from 'commander';
import * as directory from '../../lib/api/directory';
import { formatList } from '../../lib/output/format';
import { globalOpts, makeClient } from '../_shared';

export async function runList(cmd: Command, args: { type?: string; available?: boolean; hidden?: boolean; page?: number; limit?: number }): Promise<void> {
  const client = makeClient(cmd);
  const entries = await directory.list(client, {
    type: args.type as any,
    available: args.available,
    hidden: args.hidden,
    limit: args.limit,
  });
  await formatList(entries, {
    ...globalOpts(cmd),
    columns: [
      { header: 'EXTENSION', get: (e) => e.extension ?? e.id ?? '' },
      { header: 'NAME', get: (e) => e.displayName ?? '' },
      { header: 'TYPE', get: (e) => (e.type === 'callGroup' ? 'group' : e.type ?? '') },
      { header: 'STATUS', get: (e) => e.status ?? (e.available ? 'available' : 'unknown') },
      { header: 'DEVICES', get: (e) => (e.devices ? e.devices.length : (e.members ? `${e.members.length} members` : '-')) },
    ],
  });
}

export function listCommand(parent: Command): void {
  parent
    .command('list')
    .description('List all directory entries')
    .option('--type <type>', 'Filter by type: user, group, device')
    .option('--available', 'Only entries currently available', false)
    .option('--hidden', 'Include hidden entries', false)
    .option('--page <n>', 'Page number', (v) => parseInt(v, 10))
    .option('--limit <n>', 'Items per page', (v) => parseInt(v, 10))
    .action(async function (this: Command, opts) {
      await runList(this, opts);
    });
}
