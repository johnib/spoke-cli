import { Command } from 'commander';
import * as users from '../../lib/api/users';
import { formatItem } from '../../lib/output/format';
import { globalOpts, makeClient } from '../_shared';
import { logger } from '../../lib/logger';

export async function runAvailability(cmd: Command, id: string, opts: { watch?: boolean }): Promise<void> {
  const client = makeClient(cmd);
  const tick = async () => {
    const a = await users.availability(client, id);
    await formatItem(a, {
      ...globalOpts(cmd),
      fields: [
        { label: 'User', get: (x) => x.user.displayName ?? id },
        { label: 'Extension', get: (x) => x.user.extension ?? '' },
        { label: 'Status', get: (x) => x.status },
        { label: 'Summary', get: (x) => x.summary ?? '' },
        { label: 'Available', get: (x) => x.available },
        { label: 'Login Status', get: (x) => x.user.loginStatus ?? '' },
      ],
    });
  };
  if (!opts.watch) {
    await tick();
    return;
  }
  while (true) {
    logger.out('\x1b[2J\x1b[H'); // clear screen
    await tick();
    await new Promise((r) => setTimeout(r, 5_000));
  }
}

export function availabilityCommand(parent: Command): void {
  parent
    .command('availability <id>')
    .description('Check user availability (extension, UUID, or email)')
    .option('--watch', 'Poll every 5s and update in place', false)
    .action(async function (this: Command, id: string, opts) {
      await runAvailability(this, id, opts);
    });
}
