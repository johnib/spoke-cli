import { Command } from 'commander';
import { listCommand } from './list';
import { getCommand } from './get';
import { sendCommand } from './send';

export function registerMessageCommands(program: Command): void {
  const m = program.command('message').description('Send and inspect messages');
  listCommand(m);
  getCommand(m);
  sendCommand(m);
}
