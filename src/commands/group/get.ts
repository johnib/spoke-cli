import { Command } from 'commander';
import * as groups from '../../lib/api/groups';
import { formatItem } from '../../lib/output/format';
import { globalOpts, makeClient } from '../_shared';

export async function runGet(cmd: Command, idOrName: string): Promise<void> {
  const client = makeClient(cmd);
  const g = await groups.get(client, idOrName);
  const memberCount = g.availability?.totalMembers ?? (g.teamMembers ?? []).length;
  const availCount =
    g.availability?.totalAvailable ??
    (g.teamMembers ?? []).filter((m) => m.availability?.status === 'available').length;
  await formatItem(g, {
    ...globalOpts(cmd),
    fields: [
      { label: 'ID', get: () => g.id ?? '' },
      { label: 'Extension', get: () => g.extension ?? '' },
      { label: 'Name', get: () => g.displayName ?? '' },
      { label: 'Members', get: () => `${memberCount} (${availCount} available)` },
      { label: 'Status', get: () => g.availability?.status ?? '' },
      { label: 'Summary', get: () => g.availability?.availabilitySummary ?? '' },
      { label: 'Hidden', get: () => Boolean(g.isHidden) },
      { label: 'TwiML URL', get: () => g.twimlRedirectUrl ?? '' },
    ],
  });
}

export function getCommand(parent: Command): void {
  parent
    .command('get <idOrName>')
    .description('Get a single group (team)')
    .action(async function (this: Command, idOrName: string) {
      await runGet(this, idOrName);
    });
}
