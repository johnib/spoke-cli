import * as path from 'node:path';
import * as os from 'node:os';

export interface SpokePaths {
  home: string;
  configFile: string;
  tokensDir: string;
}

/**
 * Resolves the directory layout used by the CLI for config/state.
 * SPOKE_HOME overrides the default `~/.spoke` location — used by tests
 * to isolate each run.
 */
export function getPaths(env: NodeJS.ProcessEnv = process.env): SpokePaths {
  const home = env.SPOKE_HOME ?? path.join(os.homedir(), '.spoke');
  return {
    home,
    configFile: path.join(home, 'config.yml'),
    tokensDir: path.join(home, 'tokens'),
  };
}

export function tokenFile(profile: string, env: NodeJS.ProcessEnv = process.env): string {
  return path.join(getPaths(env).tokensDir, `${profile}.json`);
}
