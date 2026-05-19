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
      { label: 'Call ID', get: (x) => x.callId },
      { label: 'From', get: (x) => x.from ?? '' },
      { label: 'Recipient', get: (x) => x.recipientName ?? x.recipient ?? '' },
      { label: 'Duration', get: (x) => x.durationText ?? (x.duration ? `${x.duration}s` : '') },
      { label: 'Received', get: (x) => x.receivedAt ?? '' },
      { label: 'Recording URL', get: (x) => x.recordingUrl ?? '' },
      { label: 'Transcription', get: (x) => x.transcription ?? '(not available)' },
      { label: 'Confidence', get: (x) => x.transcriptionConfidence ?? '' },
    ],
  });
}

export function getCommand(parent: Command): void {
  parent
    .command('get <id>')
    .description('Get a single voicemail (accepts voicemail id or parent call id)')
    .action(async function (this: Command, id: string) {
      await runGet(this, id);
    });
}
