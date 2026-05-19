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
      { label: 'ID', get: (x) => x.id ?? id },
      { label: 'Vendor Call ID', get: (x) => x.vendorCallId ?? '' },
      { label: 'Direction', get: (x) => x.direction ?? '' },
      { label: 'Status', get: (x) => x.status ?? '' },
      { label: 'Outcome', get: (x) => x.outcome?.status ?? '' },
      { label: 'Outcome Reason', get: (x) => x.outcome?.reason ?? '' },
      { label: 'Contact', get: (x) => x.contactNumber ?? x.initiator ?? '' },
      { label: 'Company', get: (x) => x.companyNumber ?? '' },
      { label: 'Recipient', get: (x) => x.recipient ?? '' },
      { label: 'Target', get: (x) => x.directoryTarget?.displayName ?? '' },
      { label: 'Assigned User', get: (x) => x.assignedUser?.firstName && x.assignedUser?.lastName ? `${x.assignedUser.firstName} ${x.assignedUser.lastName}` : '' },
      { label: 'Duration', get: (x) => calls.formatDurationMs(x.duration) },
      { label: 'Wait Time', get: (x) => calls.formatDurationMs(x.waitTime) },
      { label: 'Started', get: (x) => x.startedAt ?? '' },
      { label: 'Answered', get: (x) => x.answeredAt ?? '' },
      { label: 'Ended', get: (x) => x.endedAt ?? '' },
      { label: 'Voicemail', get: (x) => x.voicemail ? `yes (${x.voicemail.duration ?? '?'}s)` : '' },
      { label: 'Recordings', get: (x) => (x.recordings ?? []).length },
    ],
  });
}

export function getCommand(parent: Command): void {
  parent
    .command('get <id>')
    .description('Get a single call by its Spoke id (UUID)')
    .option('--recording', 'Include recording URL', false)
    .action(async function (this: Command, id: string, opts) {
      await runGet(this, id, opts);
    });
}
