import { Command } from 'commander';
import { listProfiles, readConfig } from '../../lib/auth/profiles';
import { readToken, isExpired } from '../../lib/auth/token-cache';
import { formatList } from '../../lib/output/format';
import { globalOpts } from '../_shared';

interface ProfileRow {
  name: string;
  tenant: string;
  status: string;
}

export async function runProfiles(opts: any): Promise<void> {
  const cfg = readConfig();
  const profiles = listProfiles();
  const rows: ProfileRow[] = Object.entries(profiles).map(([name, p]) => {
    const cached = readToken(name);
    let status = 'no token';
    if (cached) status = isExpired(cached) ? 'expired' : 'valid';
    if (cfg.default_profile === name) status = `${status} (default)`;
    return { name, tenant: p.tenant ?? '-', status };
  });
  await formatList(rows, {
    ...opts,
    columns: [
      { header: 'NAME', get: (r) => r.name },
      { header: 'TENANT', get: (r) => r.tenant },
      { header: 'STATUS', get: (r) => r.status },
    ],
  });
}

export function profilesCommand(parent: Command): void {
  parent
    .command('profiles')
    .description('List saved auth profiles')
    .action(async function (this: Command) {
      await runProfiles(globalOpts(this));
    });
}
