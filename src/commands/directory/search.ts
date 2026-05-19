import { Command } from 'commander';
import * as directory from '../../lib/api/directory';
import { formatList } from '../../lib/output/format';
import { globalOpts, makeClient } from '../_shared';

export async function runSearch(
  cmd: Command,
  query: string,
  opts: { type?: string; available?: boolean },
): Promise<void> {
  const client = makeClient(cmd);
  const entries = await directory.search(client, query, {
    type: opts.type as any,
    available: opts.available,
  });
  await formatList(entries, {
    ...globalOpts(cmd),
    columns: [
      { header: 'EXTENSION', get: (e) => e.extension ?? e.id ?? '' },
      { header: 'NAME', get: (e) => e.displayName ?? '' },
      { header: 'TYPE', get: (e) => (e.type === 'callGroup' ? 'group' : e.type ?? '') },
      { header: 'STATUS', get: (e) => e.status ?? (e.available ? 'available' : 'unknown') },
    ],
  });
}

export function searchCommand(parent: Command): void {
  parent
    .command('search <query>')
    .description('Search the directory')
    .option('--type <type>', 'Filter by type: user, group, device')
    .option('--available', 'Only available entries', false)
    .action(async function (this: Command, query: string, opts) {
      await runSearch(this, query, opts);
    });
}
