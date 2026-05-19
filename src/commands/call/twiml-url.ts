import { Command } from 'commander';
import * as calls from '../../lib/api/calls';
import { logger } from '../../lib/logger';
import { ValidationError } from '../../lib/errors';

export function runTwimlUrl(opts: {
  extension?: string;
  organisationId?: string;
  returnTo?: 'flow' | 'taskQueue' | 'postEndpoint';
  returnToId?: string;
  priority?: number;
  timeout?: number;
  nextOfferTimeout?: number;
  sendToVoicemail?: boolean;
}): void {
  if (!opts.extension) throw new ValidationError('--extension is required');
  logger.info(
    calls.twimlRedirectUrl({
      extension: opts.extension,
      organisationId: opts.organisationId,
      returnTo: opts.returnTo,
      returnToId: opts.returnToId,
      priority: opts.priority,
      timeout: opts.timeout,
      nextOfferTimeout: opts.nextOfferTimeout,
      sendToVoicemail: opts.sendToVoicemail || undefined,
    }),
  );
}

export function twimlUrlCommand(parent: Command): void {
  parent
    .command('twiml-url')
    .description('Build a TwiML redirect URL (the URL Twilio fetches to bridge a call into Spoke)')
    .requiredOption('--extension <ext>', 'Spoke extension to redirect to')
    .option('--organisation-id <id>', 'Your Spoke organisation ID (required by the handler for signature validation)')
    .option('--return-to <type>', 'flow | taskQueue | postEndpoint')
    .option('--return-to-id <id>', 'Studio Flow SID, TaskRouter Workflow SID, or HTTPS URL')
    .option('--priority <n>', 'Priority 1 (highest) to 9 (lowest); default 5', (v) => parseInt(v, 10))
    .option('--timeout <s>', 'Seconds to wait for answer (10–70 for users, 10–300 for teams)', (v) => parseInt(v, 10))
    .option('--next-offer-timeout <s>', 'Team rollover timeout (5–60 seconds)', (v) => parseInt(v, 10))
    .option('--send-to-voicemail', 'Bypass availability and go straight to voicemail')
    .action((opts) => runTwimlUrl(opts));
}
