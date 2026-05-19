import { Command } from 'commander';
import * as voicemails from '../../lib/api/voicemails';
import { formatItem } from '../../lib/output/format';
import { globalOpts, makeClient } from '../_shared';

export async function runGet(cmd: Command, id: string): Promise<void> {
  const client = makeClient(cmd);
  const vm = await voicemails.get(client, id);
  await formatItem(vm, {
    ...globalOpts(cmd),
    fields: [
      { label: 'ID', get: (x) => x.id ?? id },
      { label: 'Recipient', get: (x) => x.recipientName ?? x.recipientId ?? '' },
      { label: 'From', get: (x) => x.from ?? '' },
      { label: 'Duration', get: (x) => x.duration ?? 0 },
      { label: 'Received', get: (x) => x.receivedAt ?? '' },
      { label: 'Read', get: (x) => Boolean(x.read) },
      { label: 'Transcript', get: (x) => x.transcript ?? '(not available)' },
    ],
  });
}

export function getCommand(parent: Command): void {
  parent
    .command('get <id>')
    .description('Get a single voicemail')
    .action(async function (this: Command, id: string) {
      await runGet(this, id);
    });
}
