import { Command } from 'commander';
import { listCommand } from './list';
import { getCommand } from './get';
import { searchCommand } from './search';

export function registerDirectoryCommands(program: Command): void {
  const dir = program.command('directory').description('Browse the Spoke directory');
  listCommand(dir);
  getCommand(dir);
  searchCommand(dir);
}
