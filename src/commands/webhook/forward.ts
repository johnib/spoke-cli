import { Command } from 'commander';
import * as webhooks from '../../lib/api/webhooks';
import { makeClient } from '../_shared';
import { logger } from '../../lib/logger';
import localtunnel from 'localtunnel';
import { ValidationError } from '../../lib/errors';

export interface ForwardOptions {
  port?: number;
  events?: string;
  /** Disable the actual tunnel — used by tests. */
  fakeTunnel?: () => Promise<{ url: string; close(): void }>;
}

export async function runForward(cmd: Command, opts: ForwardOptions): Promise<void> {
  if (!opts.port) throw new ValidationError('--port is required');
  const events = (opts.events ?? 'call.started,call.ended').split(',').map((s) => s.trim()).filter(Boolean);
  const tunnel = await (opts.fakeTunnel
    ? opts.fakeTunnel()
    : localtunnel({ port: opts.port }));
  const client = makeClient(cmd);
  const wh = await webhooks.create(client, { url: tunnel.url, events });
  logger.info(`Tunnel: ${tunnel.url} → localhost:${opts.port}`);
  logger.info(`Webhook ${wh.id} registered. Press Ctrl+C to stop.`);
  const cleanup = async () => {
    try {
      if (wh.id) await webhooks.remove(client, wh.id);
    } catch (e) {
      // best-effort
    }
    tunnel.close();
  };
  process.once('SIGINT', () => {
    cleanup().finally(() => process.exit(0));
  });
  // Don't return until tunnel closes. The tunnel doesn't emit a promise; we
  // just sit here until SIGINT.
  await new Promise<void>(() => {
    /* never resolves; SIGINT exits */
  });
}

export function forwardCommand(parent: Command): void {
  parent
    .command('forward')
    .description('Forward webhook events to a local port via tunnel')
    .requiredOption('--port <n>', 'Local port to forward to', (v) => parseInt(v, 10))
    .option('--events <list>', 'Comma-separated event types', 'call.started,call.ended')
    .action(async function (this: Command, opts) {
      await runForward(this, opts);
    });
}
