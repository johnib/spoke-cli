import { Command } from 'commander';
import * as calls from '../../lib/api/calls';
import { formatList } from '../../lib/output/format';
import { globalOpts, makeClient } from '../_shared';

function formatDuration(seconds?: number): string {
  if (!seconds) return '00:00:00';
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export async function runList(cmd: Command, opts: { includeActive?: boolean; since?: number; before?: number; limit?: number }): Promise<void> {
  const client = makeClient(cmd);
  const arr = await calls.list(client, {
    includeActive: opts.includeActive ?? true,
    since: opts.since,
    before: opts.before,
    limit: opts.limit,
  });
  await formatList(arr, {
    ...globalOpts(cmd),
    columns: [
      { header: 'SID', get: (c) => c.sid ?? c.id ?? '' },
      { header: 'FROM', get: (c) => c.from ?? '' },
      { header: 'TO', get: (c) => c.to ?? '' },
      { header: 'STATUS', get: (c) => c.status ?? '' },
      { header: 'DURATION', get: (c) => formatDuration(c.duration) },
    ],
  });
}

export function listCommand(parent: Command): void {
  parent
    .command('list')
    .description('List calls')
    .option('--no-active', 'Exclude active calls (default: include)')
    .option('--since <ts>', 'Unix timestamp lower bound', (v) => parseInt(v, 10))
    .option('--before <ts>', 'Unix timestamp upper bound', (v) => parseInt(v, 10))
    .option('--limit <n>', 'Items per page', (v) => parseInt(v, 10))
    .action(async function (this: Command, opts) {
      await runList(this, { includeActive: opts.active !== false, ...opts });
    });
}
