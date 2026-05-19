import { Command } from 'commander';
import * as readline from 'node:readline';
import { saveProfile, resolveActiveProfile } from '../../lib/auth/profiles';
import { fetchToken } from '../../lib/auth/oauth';
import { writeToken } from '../../lib/auth/token-cache';
import { logger } from '../../lib/logger';
import { ValidationError, AuthError } from '../../lib/errors';
import { DEFAULT_API_URL, DEFAULT_AUTH_URL } from '../../lib/env';

export interface LoginOptions {
  clientId?: string;
  clientSecret?: string;
  profile?: string;
  apiUrl?: string;
  authUrl?: string;
  /** Skip interactive prompts (for tests / scripted use). */
  noPrompt?: boolean;
}

async function prompt(question: string, mask = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (mask) {
      // Best-effort masking — terminal still echoes initially.
      (rl as any)._writeToOutput = (s: string) => {
        if (s.endsWith('\n') || s.endsWith('\r')) {
          (rl as any).output.write(s);
        } else {
          (rl as any).output.write('*');
        }
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export async function runLogin(opts: LoginOptions): Promise<void> {
  let clientId = opts.clientId;
  let clientSecret = opts.clientSecret;
  if ((!clientId || !clientSecret) && opts.noPrompt) {
    throw new ValidationError('--client-id and --client-secret are required in non-interactive mode');
  }
  if (!clientId) clientId = (await prompt('Spoke Client ID: ')).trim();
  if (!clientSecret) clientSecret = (await prompt('Spoke Client Secret: ', true)).trim();
  if (!clientId || !clientSecret) {
    throw new ValidationError('client id and secret are required');
  }
  const name = opts.profile ?? 'default';
  const apiUrl = opts.apiUrl ?? DEFAULT_API_URL;
  const authUrl = opts.authUrl ?? DEFAULT_AUTH_URL;
  saveProfile({ name, clientId, clientSecret, apiUrl, authUrl });
  // Immediately validate by fetching a token.
  try {
    const active = resolveActiveProfile(name);
    const tok = await fetchToken(active);
    writeToken(name, tok);
  } catch (err) {
    if (err instanceof AuthError) {
      throw new AuthError(`saved profile "${name}" but token request failed: ${err.message}`);
    }
    throw err;
  }
  logger.info(`✓ Saved profile "${name}" and verified credentials.`);
}

export function loginCommand(parent: Command): void {
  parent
    .command('login')
    .description('Store credentials for a Spoke account')
    .option('--client-id <id>', 'OAuth2 client id')
    .option('--client-secret <secret>', 'OAuth2 client secret')
    .option('--api-url <url>', 'Override API base URL')
    .option('--auth-url <url>', 'Override OAuth token URL')
    .option('--no-prompt', 'Fail rather than prompting interactively')
    .action(async function (this: Command, opts) {
      const merged = this.optsWithGlobals();
      await runLogin({
        clientId: opts.clientId,
        clientSecret: opts.clientSecret,
        profile: merged.profile,
        apiUrl: opts.apiUrl,
        authUrl: opts.authUrl,
        noPrompt: opts.prompt === false,
      });
    });
}
