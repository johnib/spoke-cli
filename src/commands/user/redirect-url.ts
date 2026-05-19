import { Command } from 'commander';
import * as directory from '../../lib/api/directory';
import { logger } from '../../lib/logger';
import { NotFoundError } from '../../lib/errors';
import { makeClient } from '../_shared';

export async function runRedirectUrl(cmd: Command, id: string): Promise<void> {
  const client = makeClient(cmd);
  const entry = await directory.get(client, id);
  if (!entry.twimlRedirectUrl) {
    throw new NotFoundError(`directory entry ${id} has no twimlRedirectUrl`);
  }
  logger.info(entry.twimlRedirectUrl);
}

export function redirectUrlCommand(parent: Command): void {
  parent
    .command('redirect-url <id>')
    .description('Print the TwiML redirect URL for a user (the URL Twilio fetches to bridge a call into Spoke)')
    .action(async function (this: Command, id: string) {
      await runRedirectUrl(this, id);
    });
}
