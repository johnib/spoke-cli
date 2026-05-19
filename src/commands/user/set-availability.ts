import { Command } from 'commander';
import * as users from '../../lib/api/users';
import { formatItem } from '../../lib/output/format';
import { globalOpts, makeClient } from '../_shared';
import { ValidationError } from '../../lib/errors';

const VALID_STATUSES = ['available', 'busy', 'unavailable'] as const;
type Status = (typeof VALID_STATUSES)[number];

export async function runSetAvailability(
  cmd: Command,
  id: string,
  opts: { status?: string },
): Promise<void> {
  if (!opts.status) throw new ValidationError('--status is required');
  if (!VALID_STATUSES.includes(opts.status as Status)) {
    throw new ValidationError(`--status must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  const client = makeClient(cmd);
  const u = await users.setAvailability(client, id, opts.status as Status);
  await formatItem(u, {
    ...globalOpts(cmd),
    fields: [
      { label: 'Extension', get: (x) => x.extension ?? id },
      { label: 'Name', get: (x) => x.displayName ?? '' },
      { label: 'Status', get: (x) => x.status ?? opts.status! },
    ],
  });
}

export function setAvailabilityCommand(parent: Command): void {
  parent
    .command('set-availability <id>')
    .description('Update a user\'s availability')
    .requiredOption('--status <status>', `New status (${VALID_STATUSES.join('|')})`)
    .action(async function (this: Command, id: string, opts) {
      await runSetAvailability(this, id, opts);
    });
}
