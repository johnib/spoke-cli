import { Command } from 'commander';
import * as groups from '../../lib/api/groups';
import { formatItem } from '../../lib/output/format';
import { globalOpts, makeClient } from '../_shared';
import { logger } from '../../lib/logger';

export async function runAvailability(cmd: Command, idOrName: string, opts: { watch?: boolean }): Promise<void> {
  const client = makeClient(cmd);
  const tick = async () => {
    const a = await groups.availability(client, idOrName);
    await formatItem(a, {
      ...globalOpts(cmd),
      fields: [
        { label: 'Group', get: (x) => x.group.displayName ?? idOrName },
        { label: 'Extension', get: (x) => x.group.extension ?? idOrName },
        { label: 'Available', get: (x) => `${x.available}/${x.total}` },
      ],
    });
  };
  if (!opts.watch) {
    await tick();
    return;
  }
  while (true) {
    logger.out('\x1b[2J\x1b[H');
    await tick();
    await new Promise((r) => setTimeout(r, 5_000));
  }
}

export function availabilityCommand(parent: Command): void {
  parent
    .command('availability <idOrName>')
    .description('Show available/total member count')
    .option('--watch', 'Poll every 5s', false)
    .action(async function (this: Command, idOrName: string, opts) {
      await runAvailability(this, idOrName, opts);
    });
}
