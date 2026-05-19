import { Command } from 'commander';
import { listCommand } from './list';
import { getCommand } from './get';
import { transcriptCommand } from './transcript';
import { downloadCommand } from './download';

export function registerVoicemailCommands(program: Command): void {
  const vm = program.command('voicemail').description('Manage voicemails');
  listCommand(vm);
  getCommand(vm);
  transcriptCommand(vm);
  downloadCommand(vm);
}
