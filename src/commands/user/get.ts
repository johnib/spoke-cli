import { Command } from 'commander';
import * as users from '../../lib/api/users';
import { formatItem } from '../../lib/output/format';
import { globalOpts, makeClient } from '../_shared';

export async function runGet(cmd: Command, idArg: string | undefined, opts: { me?: boolean }): Promise<void> {
  const client = makeClient(cmd);
  const u = opts.me ? await users.me(client) : await users.get(client, idArg ?? '');
  await formatItem(u, {
    ...globalOpts(cmd),
    fields: [
      { label: 'ID', get: (x) => x.id ?? '' },
      { label: 'Extension', get: (x) => x.extension ?? '' },
      { label: 'Name', get: (x) => x.displayName ?? '' },
      { label: 'Email', get: (x) => x.email ?? '' },
      { label: 'Status', get: (x) => x.status ?? '' },
      { label: 'Devices', get: (x) => (x.devices ?? []).map((d) => `${d.name ?? d.id} (${d.status ?? '-'})`) },
      { label: 'Groups', get: (x) => (x.groups ?? []).map((g) => g.name ?? g.id) },
    ],
  });
}

export function getCommand(parent: Command): void {
  parent
    .command('get [idOrEmail]')
    .description('Get a single user')
    .option('--me', 'Get the user associated with the current credentials')
    .action(async function (this: Command, idArg: string | undefined, opts) {
      await runGet(this, idArg, opts);
    });
}
