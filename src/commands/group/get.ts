import { Command } from 'commander';
import * as groups from '../../lib/api/groups';
import { formatItem } from '../../lib/output/format';
import { globalOpts, makeClient } from '../_shared';

export async function runGet(cmd: Command, idOrName: string): Promise<void> {
  const client = makeClient(cmd);
  const g = await groups.get(client, idOrName);
  const memberCount = (g.members ?? []).length;
  const avail = (g.members ?? []).filter((m) => m.available || m.status === 'available').length;
  await formatItem(g, {
    ...globalOpts(cmd),
    fields: [
      { label: 'Extension', get: () => g.extension ?? g.id ?? '' },
      { label: 'Name', get: () => g.displayName ?? '' },
      { label: 'Members', get: () => `${memberCount} (${avail} available)` },
      { label: 'Routing', get: () => g.routing ?? '' },
      { label: 'Voicemail', get: () => (g.voicemail ? 'enabled' : 'disabled') },
      { label: 'Hidden', get: () => Boolean(g.hidden) },
      { label: 'TwiML URL', get: () => g.twimlUrl ?? '' },
    ],
  });
}

export function getCommand(parent: Command): void {
  parent
    .command('get <idOrName>')
    .description('Get a single group')
    .action(async function (this: Command, idOrName: string) {
      await runGet(this, idOrName);
    });
}
