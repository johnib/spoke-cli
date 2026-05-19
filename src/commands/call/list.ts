import { Command } from 'commander';
import * as calls from '../../lib/api/calls';
import { formatList } from '../../lib/output/format';
import { globalOpts, makeClient } from '../_shared';
import { logger } from '../../lib/logger';

export async function runList(cmd: Command, opts: {
  includeActive?: boolean;
  since?: number;
  before?: number;
  modified?: number;
  contactNumber?: string;
  limit?: number;
  sortOrder?: 'ascending' | 'descending';
  all?: boolean;
}): Promise<void> {
  const client = makeClient(cmd);
  const arr = opts.all
    ? await calls.listAll(client, opts, (pageIdx, total) => {
        logger.debug(`fetched page ${pageIdx} (${total} calls so far)`);
      })
    : await calls.list(client, opts);
  await formatList(arr, {
    ...globalOpts(cmd),
    columns: [
      { header: 'ID', get: (c) => c.id ?? '' },
      { header: 'DIR', get: (c) => c.direction ?? '' },
      { header: 'CONTACT', get: (c) => c.contactNumber ?? c.initiator ?? '' },
      { header: 'COMPANY', get: (c) => c.companyNumber ?? '' },
      { header: 'TARGET', get: (c) => c.directoryTarget?.displayName ?? c.recipient ?? '' },
      { header: 'OUTCOME', get: (c) => c.outcome?.status ?? c.status ?? '' },
      { header: 'DURATION', get: (c) => calls.formatDurationMs(c.duration) },
      { header: 'STARTED', get: (c) => (c.startedAt ?? '').slice(0, 19).replace('T', ' ') },
    ],
  });
}

export function listCommand(parent: Command): void {
  parent
    .command('list')
    .description('List calls')
    .option('--no-active', 'Exclude active calls (default: include)')
    .option(
      '--since <ts>',
      'Lower bound — Unix timestamp (seconds OR milliseconds; auto-detected)',
      (v) => parseInt(v, 10),
    )
    .option(
      '--before <ts>',
      'Upper bound — Unix timestamp (seconds OR milliseconds; auto-detected)',
      (v) => parseInt(v, 10),
    )
    .option(
      '--modified <ts>',
      'Return calls modified since this timestamp (seconds OR ms; auto-detected). Recommended for incremental polling.',
      (v) => parseInt(v, 10),
    )
    .option('--contact-number <e164>', 'Filter by contact number (E.164)')
    .option('--sort-order <order>', 'ascending or descending')
    .option('--limit <n>', 'Items per page (default 100, max 1000)', (v) => parseInt(v, 10))
    .option(
      '--all',
      'Fetch every page by following meta.next cursors. Use with --since/--before to bound the range.',
      false,
    )
    .action(async function (this: Command, opts) {
      await runList(this, { includeActive: opts.active !== false, ...opts });
    });
}
