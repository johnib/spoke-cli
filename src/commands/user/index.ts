import { Command } from 'commander';
import { listCommand } from './list';
import { getCommand } from './get';
import { availabilityCommand } from './availability';
import { setAvailabilityCommand } from './set-availability';
import { redirectUrlCommand } from './redirect-url';

export function registerUserCommands(program: Command): void {
  const u = program.command('user').description('Manage Spoke users');
  listCommand(u);
  getCommand(u);
  availabilityCommand(u);
  setAvailabilityCommand(u);
  redirectUrlCommand(u);
}
