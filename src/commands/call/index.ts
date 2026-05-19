import { Command } from 'commander';
import { listCommand } from './list';
import { getCommand } from './get';
import { twimlUrlCommand } from './twiml-url';

export function registerCallCommands(program: Command): void {
  const c = program.command('call').description('Inspect calls');
  listCommand(c);
  getCommand(c);
  twimlUrlCommand(c);
}
