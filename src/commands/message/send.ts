import { Command } from 'commander';
import * as messages from '../../lib/api/messages';
import { formatItem } from '../../lib/output/format';
import { globalOpts, makeClient } from '../_shared';
import { ValidationError } from '../../lib/errors';

export async function runSend(cmd: Command, opts: {
  to?: string;
  from?: string;
  body?: string;
  channel?: string;
}): Promise<void> {
  if (!opts.to) throw new ValidationError('--to is required');
  if (!opts.from) throw new ValidationError('--from is required');
  if (!opts.body) throw new ValidationError('--body is required');
  const client = makeClient(cmd);
  const m = await messages.send(client, {
    to: opts.to,
    from: opts.from,
    body: opts.body,
    channel: opts.channel as any,
  });
  await formatItem(m, {
    ...globalOpts(cmd),
    fields: [
      { label: 'ID', get: (x) => x.id ?? '' },
      { label: 'Status', get: (x) => x.status ?? 'queued' },
      { label: 'To', get: (x) => x.to ?? opts.to ?? '' },
      { label: 'From', get: (x) => x.from ?? opts.from ?? '' },
      { label: 'Channel', get: (x) => x.channel ?? opts.channel ?? 'sms' },
    ],
  });
}

export function sendCommand(parent: Command): void {
  parent
    .command('send')
    .description('Send a message')
    .requiredOption('--to <number>', 'Destination +E164 number')
    .requiredOption('--from <ext>', 'Sender extension')
    .requiredOption('--body <text>', 'Message body')
    .option('--channel <ch>', 'sms or whatsapp', 'sms')
    .action(async function (this: Command, opts) {
      await runSend(this, opts);
    });
}
