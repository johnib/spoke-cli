import { Command } from 'commander';
import * as directory from '../../lib/api/directory';
import { formatItem } from '../../lib/output/format';
import { globalOpts, makeClient } from '../_shared';

export async function runGet(cmd: Command, idOrName: string): Promise<void> {
  const client = makeClient(cmd);
  const entry = await directory.get(client, idOrName);
  await formatItem(entry, {
    ...globalOpts(cmd),
    fields: [
      { label: 'Extension', get: (e) => e.extension ?? e.id ?? '' },
      { label: 'Name', get: (e) => e.displayName ?? '' },
      { label: 'Type', get: (e) => (e.type === 'callGroup' ? 'group' : e.type ?? '') },
      { label: 'Status', get: (e) => e.status ?? '' },
      { label: 'Devices', get: (e) => (e.devices ?? []).map((d) => `${d.name} (${d.status ?? '-'})`) },
      { label: 'TwiML URL', get: (e) => e.twimlUrl ?? '' },
    ],
  });
}

export function getCommand(parent: Command): void {
  parent
    .command('get <idOrName>')
    .description('Get a single directory entry')
    .action(async function (this: Command, idOrName: string) {
      await runGet(this, idOrName);
    });
}
