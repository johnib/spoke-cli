import { Command } from 'commander';
import * as users from '../../lib/api/users';
import { formatItem } from '../../lib/output/format';
import { globalOpts, makeClient } from '../_shared';

export async function runGet(
  cmd: Command,
  idArg: string | undefined,
  opts: { me?: boolean },
): Promise<void> {
  const client = makeClient(cmd);
  const u = opts.me ? await users.me(client) : await users.get(client, idArg ?? '');
  await formatItem(u, {
    ...globalOpts(cmd),
    fields: [
      { label: 'ID', get: (x) => x.id ?? '' },
      { label: 'Extension', get: (x) => x.extension ?? '' },
      { label: 'Name', get: (x) => x.displayName ?? '' },
      { label: 'Email', get: (x) => x.email ?? '' },
      { label: 'Job Title', get: (x) => x.jobTitle ?? '' },
      { label: 'Location', get: (x) => x.location ?? '' },
      { label: 'Mobile', get: (x) => x.mobile ?? '' },
      { label: 'Availability', get: (x) => x.availability?.availabilitySummary ?? x.availability?.status ?? '' },
      { label: 'Login Status', get: (x) => x.loginStatus ?? '' },
      { label: 'Employment', get: (x) => x.status ?? '' },
      { label: 'Teams', get: (x) => (x.teams ?? []).join(', ') },
      { label: 'TwiML URL', get: (x) => x.twimlRedirectUrl ?? '' },
    ],
  });
}

export function getCommand(parent: Command): void {
  parent
    .command('get [idOrEmailOrExt]')
    .description('Get a single user by UUID, email, or extension')
    .option('--me', 'Get the user associated with the current credentials')
    .action(async function (this: Command, idArg: string | undefined, opts) {
      await runGet(this, idArg, opts);
    });
}
