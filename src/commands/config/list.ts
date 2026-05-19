import { Command } from 'commander';
import { listSettings } from '../../lib/config/settings';
import { logger } from '../../lib/logger';

export function runList(): void {
  const all = listSettings();
  const maxKey = Math.max(...Object.keys(all).map((k) => k.length));
  for (const [k, v] of Object.entries(all)) {
    logger.info(`${k.padEnd(maxKey)} = ${v ?? '(unset)'}`);
  }
}

export function listCommand(parent: Command): void {
  parent
    .command('list')
    .description('List all config values')
    .action(() => runList());
}
