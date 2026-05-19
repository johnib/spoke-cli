import { Command } from 'commander';
import * as voicemails from '../../lib/api/voicemails';
import { logger } from '../../lib/logger';
import { makeClient } from '../_shared';

export async function runDownload(cmd: Command, id: string, opts: { output?: string }): Promise<void> {
  const client = makeClient(cmd);
  const out = opts.output ?? `${id}.mp3`;
  await voicemails.download(client, id, out);
  logger.info(`✓ Saved voicemail ${id} to ${out}`);
}

export function downloadCommand(parent: Command): void {
  parent
    .command('download <id>')
    .description('Download a voicemail recording')
    .option('--output <path>', 'Output file (default: <id>.mp3)')
    .action(async function (this: Command, id: string, opts) {
      await runDownload(this, id, opts);
    });
}
