import { Command } from 'commander';
import { runWithExitCode } from './lib/exit';
import { logger } from './lib/logger';

import { registerAuthCommands } from './commands/auth';
import { registerDirectoryCommands } from './commands/directory';
import { registerUserCommands } from './commands/user';
import { registerGroupCommands } from './commands/group';
import { registerDeviceCommands } from './commands/device';
import { registerCallCommands } from './commands/call';
import { registerMessageCommands } from './commands/message';
import { registerVoicemailCommands } from './commands/voicemail';
import { registerWebhookCommands } from './commands/webhook';
import { registerConfigCommands } from './commands/config';
import { registerApiCommand } from './commands/api';
import { registerMcpCommands } from './commands/mcp';

export function buildProgram(): Command {
  const program = new Command();
  program
    .name('spoke')
    .description('Command-line interface for Spoke Phone')
    .version('0.1.0', '-V, --version', 'Print spoke CLI version');

  // Configure exitOverride FIRST so all subcommands inherit it via copyInheritedSettings.
  // We THROW on every callback (including help/version) — commander calls process.exit
  // if the callback returns without throwing. The outer try/catch in main()/runCli()
  // recognises the help/version codes and swallows them gracefully.
  program.exitOverride((err) => {
    throw err;
  });

  // Global flags — every subcommand inherits these via .opts().
  program
    .option('--json', 'Output raw JSON')
    .option('--table', 'Output as aligned table (default for lists)')
    .option('--jq <expr>', 'Filter JSON output with a JSONata expression')
    .option('--template <tmpl>', 'Go-style template for output formatting')
    .option('--no-color', 'Disable ANSI color output')
    .option('-s, --silent', 'Suppress all output except errors')
    .option('--dry-run', 'Print what would happen; make no API calls')
    .option('-p, --profile <name>', 'Use a named auth profile')
    .option('-v, --verbose', 'Print HTTP request/response details');

  program.hook('preAction', (thisCommand) => {
    const opts = thisCommand.optsWithGlobals();
    if (opts.silent) logger.setSilent(true);
    if (opts.verbose) logger.setVerbose(true);
  });

  registerAuthCommands(program);
  registerDirectoryCommands(program);
  registerUserCommands(program);
  registerGroupCommands(program);
  registerDeviceCommands(program);
  registerCallCommands(program);
  registerMessageCommands(program);
  registerVoicemailCommands(program);
  registerWebhookCommands(program);
  registerConfigCommands(program);
  registerApiCommand(program);
  registerMcpCommands(program);

  return program;
}

/* istanbul ignore next */
export async function main(argv: string[] = process.argv): Promise<number> {
  const program = buildProgram();
  return runWithExitCode(async () => {
    try {
      await program.parseAsync(argv);
    } catch (err: any) {
      if (
        err?.code === 'commander.help' ||
        err?.code === 'commander.helpDisplayed' ||
        err?.code === 'commander.version'
      ) {
        return;
      }
      throw err;
    }
  });
}

/* istanbul ignore next */
if (require.main === module) {
  main().then((code) => {
    process.exit(code);
  });
}
