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
        { label: 'User', get: (x) => x.user.displayName ?? x.user.id ?? id },
        { label: 'Extension', get: (x) => x.user.extension ?? id },
        { label: 'Available', get: (x) => x.available },
        { label: 'Status', get: (x) => x.status },
        { label: 'Devices', get: (x) => (x.user.devices ?? []).map((d) => `${d.name ?? d.id} ✓`) },
      ],
    });
  };
  if (!opts.watch) {
    await tick();
    return;
  }
  const intervalMs = 5_000;
  while (true) {
    logger.out('\x1b[2J\x1b[H'); // clear screen
    await tick();
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

export function availabilityCommand(parent: Command): void {
  parent
    .command('availability <id>')
    .description('Check user availability')
    .option('--watch', 'Poll every 5s and update in place', false)
    .action(async function (this: Command, id: string, opts) {
      await runAvailability(this, id, opts);
    });
}
