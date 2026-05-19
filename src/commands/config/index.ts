import { Command } from 'commander';
import { getCommand } from './get';
import { setCommand } from './set';
import { listCommand } from './list';

export function registerConfigCommands(program: Command): void {
  const c = program.command('config').description('Manage CLI configuration');
  getCommand(c);
  setCommand(c);
  listCommand(c);
}
