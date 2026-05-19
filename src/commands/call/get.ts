import { Command } from 'commander';
import * as calls from '../../lib/api/calls';
import { formatItem } from '../../lib/output/format';
import { globalOpts, makeClient } from '../_shared';

export async function runGet(cmd: Command, id: string, opts: { recording?: boolean }): Promise<void> {
  const client = makeClient(cmd);
  const c = await calls.get(client, id, opts.recording ? { includeRecordingUrl: true } : {});
  await formatItem(c, {
    ...globalOpts(cmd),
    fields: [
      { label: 'SID', get: (x) => x.sid ?? x.id ?? id },
      { label: 'From', get: (x) => x.from ?? '' },
      { label: 'To', get: (x) => x.to ?? '' },
      { label: 'Status', get: (x) => x.status ?? '' },
      { label: 'Direction', get: (x) => x.direction ?? '' },
      { label: 'Duration', get: (x) => x.duration ?? 0 },
      { label: 'Recording', get: (x) => x.recordingUrl ?? '' },
    ],
  });
}

export function getCommand(parent: Command): void {
  parent
    .command('get <sid>')
    .description('Get a single call')
    .option('--recording', 'Include recording URL', false)
    .action(async function (this: Command, sid: string, opts) {
      await runGet(this, sid, opts);
    });
}
