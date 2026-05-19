import { Command } from 'commander';
import { listCommand } from './list';
import { getCommand } from './get';

export function registerDeviceCommands(program: Command): void {
  const d = program.command('device').description('Manage registered devices');
  listCommand(d);
  getCommand(d);
}
