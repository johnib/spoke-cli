import { Command } from 'commander';
import * as webhooks from '../../lib/api/webhooks';
import { formatList } from '../../lib/output/format';
import { globalOpts, makeClient } from '../_shared';

export async function runList(cmd: Command): Promise<void> {
  const client = makeClient(cmd);
  const arr = await webhooks.list(client);
  await formatList(arr, {
    ...globalOpts(cmd),
    columns: [
      { header: 'ID', get: (w) => w.id ?? '' },
      { header: 'URL', get: (w) => w.url },
      { header: 'EVENTS', get: (w) => (w.events ?? []).join(',') },
      { header: 'MODE', get: (w) => w.mode ?? '' },
      { header: 'ENABLED', get: (w) => Boolean(w.enabled) },
    ],
  });
}

export function listCommand(parent: Command): void {
  parent
    .command('list')
    .description('List webhooks')
    .action(async function (this: Command) {
      await runList(this);
    });
}
