import { Command } from 'commander';
import * as voicemails from '../../lib/api/voicemails';
import { formatList } from '../../lib/output/format';
import { globalOpts, makeClient } from '../_shared';

export async function runList(cmd: Command, opts: { since?: number; before?: number; limit?: number }): Promise<void> {
  const client = makeClient(cmd);
  const arr = await voicemails.list(client, opts);
  await formatList(arr, {
    ...globalOpts(cmd),
    columns: [
      { header: 'ID', get: (v) => v.id ?? '' },
      { header: 'CALL', get: (v) => v.callId ?? '' },
      { header: 'FROM', get: (v) => v.from ?? '' },
      { header: 'RECIPIENT', get: (v) => v.recipientName ?? v.recipient ?? '' },
      { header: 'DURATION', get: (v) => v.durationText ?? (v.duration ? `${v.duration}s` : '') },
      { header: 'RECEIVED', get: (v) => (v.receivedAt ?? '').slice(0, 19).replace('T', ' ') },
      { header: 'TRANSCRIBED', get: (v) => (v.transcription ? 'yes' : 'no') },
    ],
  });
}

export function listCommand(parent: Command): void {
  parent
    .command('list')
    .description('List voicemails (derived from /calls — entries where call has a voicemail)')
    .option('--since <ts>', 'UNIX timestamp lower bound', (v) => parseInt(v, 10))
    .option('--before <ts>', 'UNIX timestamp upper bound', (v) => parseInt(v, 10))
    .option('--limit <n>', 'Calls to scan (default 200)', (v) => parseInt(v, 10))
    .action(async function (this: Command, opts) {
      await runList(this, opts);
    });
}
