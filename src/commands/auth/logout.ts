import { Command } from 'commander';
import { deleteProfile } from '../../lib/auth/profiles';
import { logger } from '../../lib/logger';
import { NotFoundError } from '../../lib/errors';

export interface LogoutOptions {
  profile?: string;
}

export function runLogout(opts: LogoutOptions): void {
  const name = opts.profile ?? 'default';
  const removed = deleteProfile(name);
  if (!removed) {
    throw new NotFoundError(`profile "${name}" not found`);
  }
  logger.info(`✓ Removed profile "${name}".`);
}

export function logoutCommand(parent: Command): void {
  parent
    .command('logout')
    .description('Remove stored credentials for a profile')
    .action(function (this: Command) {
      const merged = this.optsWithGlobals();
      runLogout({ profile: merged.profile });
    });
}
