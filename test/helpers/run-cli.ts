import { buildProgram } from '../../src/index';
import { runWithExitCode } from '../../src/lib/exit';
import { logger } from '../../src/lib/logger';

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Run the spoke CLI in-process. Captures stdout/stderr and returns the
 * exit code that would have been returned to the OS. Does NOT call
 * process.exit. Use this for integration testing of commands.
 */
export async function runCli(args: string[]): Promise<RunResult> {
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];

  const origStdoutWrite = process.stdout.write.bind(process.stdout);
  const origStderrWrite = process.stderr.write.bind(process.stderr);

  (process.stdout.write as any) = ((chunk: any, enc?: any, cb?: any) => {
    stdoutChunks.push(typeof chunk === 'string' ? chunk : chunk.toString());
    if (typeof cb === 'function') cb();
    return true;
  }) as typeof process.stdout.write;

  (process.stderr.write as any) = ((chunk: any, enc?: any, cb?: any) => {
    stderrChunks.push(typeof chunk === 'string' ? chunk : chunk.toString());
    if (typeof cb === 'function') cb();
    return true;
  }) as typeof process.stderr.write;

  logger.reset();

  const exitCode = await runWithExitCode(async () => {
    const program = buildProgram();
    try {
      await program.parseAsync(['node', 'spoke', ...args]);
    } catch (err: any) {
      if (err?.code === 'commander.help' || err?.code === 'commander.helpDisplayed' || err?.code === 'commander.version') {
        return;
      }
      // Surface commander errors with a friendly message instead of the verbose default.
      if (err?.code && typeof err.code === 'string' && err.code.startsWith('commander.')) {
        throw new Error(err.message || err.code);
      }
      throw err;
    }
  });

  process.stdout.write = origStdoutWrite;
  process.stderr.write = origStderrWrite;
  logger.reset();

  return {
    stdout: stdoutChunks.join(''),
    stderr: stderrChunks.join(''),
    exitCode,
  };
}
