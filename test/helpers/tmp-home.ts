import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export interface TmpHome {
  home: string;
  cleanup: () => void;
}

/**
 * Create an isolated SPOKE_HOME for a test. Sets process.env.SPOKE_HOME and
 * returns a cleanup function. Call cleanup() in afterEach/afterAll.
 */
export function setupTmpHome(): TmpHome {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'spoke-test-'));
  const prev = process.env.SPOKE_HOME;
  process.env.SPOKE_HOME = home;
  return {
    home,
    cleanup(): void {
      process.env.SPOKE_HOME = prev;
      try {
        fs.rmSync(home, { recursive: true, force: true });
      } catch {
        // ignore — best-effort
      }
    },
  };
}
