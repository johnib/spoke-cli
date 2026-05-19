import { Command } from 'commander';
import { listCommand } from './list';
import { getCommand } from './get';
import { membersCommand } from './members';
import { availabilityCommand } from './availability';
import { redirectUrlCommand } from './redirect-url';

export function registerGroupCommands(program: Command): void {
  const g = program.command('group').description('Manage call groups');
  listCommand(g);
  getCommand(g);
  membersCommand(g);
  availabilityCommand(g);
  redirectUrlCommand(g);
}
