import { Command } from 'commander';
import { getSetting } from '../../lib/config/settings';
import { logger } from '../../lib/logger';

export function runGet(key: string): void {
  const v = getSetting(key);
  if (v !== undefined) logger.info(v);
}

export function getCommand(parent: Command): void {
  parent
    .command('get <key>')
    .description('Read a config value')
    .action((key: string) => runGet(key));
}
