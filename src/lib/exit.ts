import { SpokeError } from './errors';
import { logger } from './logger';

/**
 * Wrap an async command handler so thrown SpokeErrors map cleanly to exit codes,
 * and unexpected errors surface a clear message. Returns the resolved exit code
 * (always returns rather than calling process.exit directly so it can be tested).
 */
export async function runWithExitCode(fn: () => Promise<unknown>): Promise<number> {
  try {
    await fn();
    return 0;
  } catch (err) {
    if (err instanceof SpokeError) {
      logger.error(`Error: ${err.message}`);
      if (err.hint) logger.error(err.hint);
      return err.exitCode;
    }
    if (err instanceof Error) {
      logger.error(`Error: ${err.message}`);
    } else {
      logger.error(`Error: ${String(err)}`);
    }
    return 1;
  }
}
