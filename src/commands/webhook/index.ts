import { Command } from 'commander';
import { listCommand } from './list';
import { createCommand } from './create';
import { deleteCommand } from './delete';
import { forwardCommand } from './forward';

export function registerWebhookCommands(program: Command): void {
  const w = program.command('webhook').description('Manage event subscriptions');
  listCommand(w);
  createCommand(w);
  deleteCommand(w);
  forwardCommand(w);
}
