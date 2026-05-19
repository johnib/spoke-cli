import { Command } from 'commander';
import * as voicemails from '../../lib/api/voicemails';
import { logger } from '../../lib/logger';
import { makeClient } from '../_shared';

export async function runTranscript(cmd: Command, id: string): Promise<void> {
  const client = makeClient(cmd);
  const text = await voicemails.transcript(client, id);
  logger.info(text);
}

export function transcriptCommand(parent: Command): void {
  parent
    .command('transcript <id>')
    .description('Show voicemail transcription')
    .action(async function (this: Command, id: string) {
      await runTranscript(this, id);
    });
}
