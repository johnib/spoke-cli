import { Command } from 'commander';
import { setSetting } from '../../lib/config/settings';
import { logger } from '../../lib/logger';

export function runSet(key: string, value: string): void {
  setSetting(key, value);
  logger.info(`✓ Set ${key} = ${value}`);
}

export function setCommand(parent: Command): void {
  parent
    .command('set <key> <value>')
    .description('Write a config value')
    .action((key: string, value: string) => runSet(key, value));
}
