import { Command } from 'commander';
import { sendCommand } from './send';

export function registerMessageCommands(program: Command): void {
  const m = program.command('message').description('Send messages (the API exposes no list/read; subscribe to webhook events to receive)');
  sendCommand(m);
}
