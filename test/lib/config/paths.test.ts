import { getPaths, tokenFile } from '../../../src/lib/config/paths';

describe('config/paths', () => {
  it('uses SPOKE_HOME when set', () => {
    const paths = getPaths({ SPOKE_HOME: '/tmp/spoke-x' } as NodeJS.ProcessEnv);
    expect(paths.home).toBe('/tmp/spoke-x');
    expect(paths.configFile).toBe('/tmp/spoke-x/config.yml');
    expect(paths.tokensDir).toBe('/tmp/spoke-x/tokens');
  });

  it('falls back to ~/.spoke when SPOKE_HOME is unset', () => {
    const paths = getPaths({} as NodeJS.ProcessEnv);
    expect(paths.configFile.endsWith('.spoke/config.yml')).toBe(true);
  });

  it('returns the token file path for a profile', () => {
    expect(tokenFile('foo', { SPOKE_HOME: '/tmp/x' } as NodeJS.ProcessEnv)).toBe('/tmp/x/tokens/foo.json');
  });
});
