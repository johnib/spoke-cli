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
      { label: 'ID', get: (e) => e.id ?? '' },
      { label: 'Extension', get: (e) => e.extension ?? '' },
      { label: 'Name', get: (e) => e.displayName ?? '' },
      { label: 'Type', get: (e) => (e.type === 'team' ? 'group' : e.type ?? '') },
      { label: 'Email', get: (e) => e.email ?? '' },
      { label: 'Availability', get: (e) => e.availability?.availabilitySummary ?? e.availability?.status ?? '' },
      { label: 'Login Status', get: (e) => e.loginStatus ?? '' },
      { label: 'Employment', get: (e) => e.status ?? '' },
      { label: 'Teams', get: (e) => (e.teams ?? []).join(', ') },
      { label: 'TwiML URL', get: (e) => e.twimlRedirectUrl ?? '' },
    ],
  });
}

export function getCommand(parent: Command): void {
  parent
    .command('get <idOrName>')
    .description('Get a single directory entry by UUID, extension, or name')
    .action(async function (this: Command, idOrName: string) {
      await runGet(this, idOrName);
    });
}
