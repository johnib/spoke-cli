import { Command } from 'commander';
import * as webhooks from '../../lib/api/webhooks';
import { formatItem } from '../../lib/output/format';
import { globalOpts, makeClient } from '../_shared';
import { ValidationError } from '../../lib/errors';

export async function runCreate(cmd: Command, opts: {
  url?: string;
  events?: string;
  description?: string;
  mode?: string;
}): Promise<void> {
  if (!opts.url) throw new ValidationError('--url is required');
  if (!opts.events) throw new ValidationError('--events is required');
  const events = opts.events.split(',').map((s) => s.trim()).filter(Boolean);
  if (events.length === 0) throw new ValidationError('--events must list at least one event');
  const client = makeClient(cmd);
  const w = await webhooks.create(client, {
    url: opts.url,
    events,
    description: opts.description,
    mode: (opts.mode as 'production' | 'test') ?? undefined,
  });
  await formatItem(w, {
    ...globalOpts(cmd),
    fields: [
      { label: 'ID', get: (x) => x.id ?? '' },
      { label: 'URL', get: (x) => x.url },
      { label: 'Events', get: (x) => x.events.join(', ') },
      { label: 'Mode', get: (x) => x.mode ?? '' },
      { label: 'Enabled', get: (x) => Boolean(x.enabled) },
      { label: 'Signing Secret', get: (x) => x.signingSecret ?? '' },
    ],
  });
}

export function createCommand(parent: Command): void {
  parent
    .command('create')
    .description('Create a webhook')
    .requiredOption('--url <url>', 'Receiver URL (HTTPS)')
    .requiredOption('--events <list>', 'Comma-separated event types (see spoke webhook events)')
    .option('--description <text>', 'Optional description')
    .option('--mode <mode>', 'production | test')
    .action(async function (this: Command, opts) {
      await runCreate(this, opts);
    });
}
