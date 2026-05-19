import { Command } from 'commander';
import * as users from '../../lib/api/users';
import { formatList } from '../../lib/output/format';
import { globalOpts, makeClient } from '../_shared';

export async function runList(cmd: Command, opts: { available?: boolean; email?: string; limit?: number }): Promise<void> {
  const client = makeClient(cmd);
  const arr = await users.list(client, {
    available: opts.available,
    email: opts.email,
    limit: opts.limit,
  });
  await formatList(arr, {
    ...globalOpts(cmd),
    columns: [
      { header: 'EXTENSION', get: (u) => u.extension ?? '' },
      { header: 'NAME', get: (u) => u.displayName ?? '' },
      { header: 'EMAIL', get: (u) => u.email ?? '' },
      {
        header: 'AVAILABILITY',
        get: (u) => u.availability?.availabilitySummary ?? u.availability?.status ?? '',
      },
      { header: 'EMPLOYMENT', get: (u) => u.status ?? '' },
    ],
  });
}

export function listCommand(parent: Command): void {
  parent
    .command('list')
    .description('List Spoke users')
    .option('--available', 'Only available users', false)
    .option('--email <email>', 'Filter by exact email')
    .option('--limit <n>', 'Items per page', (v) => parseInt(v, 10))
    .action(async function (this: Command, opts) {
      await runList(this, opts);
    });
}
