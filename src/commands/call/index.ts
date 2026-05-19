import { Command } from 'commander';
import { listCommand } from './list';
import { getCommand } from './get';
import { transferCommand } from './transfer';
import { redirectCommand } from './redirect';
import { hangupCommand } from './hangup';
import { twimlUrlCommand } from './twiml-url';

export function registerCallCommands(program: Command): void {
  const c = program.command('call').description('Call control');
  listCommand(c);
  getCommand(c);
  transferCommand(c);
  redirectCommand(c);
  hangupCommand(c);
  twimlUrlCommand(c);
}
