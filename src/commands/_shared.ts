import { Command } from 'commander';
import { SpokeApiClient } from '../lib/api/client';
import { OutputOptions } from '../lib/output/format';

/**
 * Inherit global options (--json, --silent, --dry-run, etc.) merged with
 * a subcommand's own options. Wraps optsWithGlobals so callers get a strongly
 * typed object including the format flags.
 */
export interface GlobalOpts extends OutputOptions {
  dryRun?: boolean;
  profile?: string;
  verbose?: boolean;
  noColor?: boolean;
}

export function globalOpts(cmd: Command): GlobalOpts {
  return cmd.optsWithGlobals() as GlobalOpts;
}

/**
 * Build an API client using the merged global options (--profile, --dry-run).
 */
export function makeClient(cmd: Command): SpokeApiClient {
  const opts = globalOpts(cmd);
  return new SpokeApiClient({ profile: opts.profile, dryRun: opts.dryRun });
}
