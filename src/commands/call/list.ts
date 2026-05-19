import { Command } from 'commander';
import * as calls from '../../lib/api/calls';
import { formatList } from '../../lib/output/format';
import { globalOpts, makeClient } from '../_shared';

export async function runList(cmd: Command, opts: {
  includeActive?: boolean;
  since?: number;
  before?: number;
  modified?: number;
  contactNumber?: string;
  limit?: number;
  sortOrder?: 'ascending' | 'descending';
}): Promise<void> {
  const client = makeClient(cmd);
  const arr = await calls.list(client, opts);
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
    .option('--since <ts>', 'Unix timestamp lower bound', (v) => parseInt(v, 10))
    .option('--before <ts>', 'Unix timestamp upper bound', (v) => parseInt(v, 10))
    .option('--modified <ts>', 'Return calls modified since this UNIX timestamp', (v) => parseInt(v, 10))
    .option('--contact-number <e164>', 'Filter by contact number (E.164)')
    .option('--sort-order <order>', 'ascending or descending')
    .option('--limit <n>', 'Items per page', (v) => parseInt(v, 10))
    .action(async function (this: Command, opts) {
      await runList(this, { includeActive: opts.active !== false, ...opts });
    });
}
