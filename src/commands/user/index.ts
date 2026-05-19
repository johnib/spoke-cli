import { Command } from 'commander';
import { listCommand } from './list';
import { getCommand } from './get';
import { availabilityCommand } from './availability';
import { redirectUrlCommand } from './redirect-url';

export function registerUserCommands(program: Command): void {
  const u = program.command('user').description('Inspect Spoke users');
  listCommand(u);
  getCommand(u);
  availabilityCommand(u);
  redirectUrlCommand(u);
}
