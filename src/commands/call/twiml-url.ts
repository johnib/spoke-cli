import { Command } from 'commander';
import * as calls from '../../lib/api/calls';
import { logger } from '../../lib/logger';
import { ValidationError } from '../../lib/errors';

export function runTwimlUrl(opts: { extension?: string; returnTo?: string }): void {
  if (!opts.extension) throw new ValidationError('--extension is required');
  logger.info(calls.twimlRedirectUrl({ extension: opts.extension, returnTo: opts.returnTo }));
}

export function twimlUrlCommand(parent: Command): void {
  parent
    .command('twiml-url')
    .description('Generate a TwiML redirect URL')
    .requiredOption('--extension <ext>', 'Spoke extension to redirect to')
    .option('--return-to <url>', 'Fallback Studio URL')
    .action((opts) => runTwimlUrl(opts));
}
