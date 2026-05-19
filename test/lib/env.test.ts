import { resolveEnv, DEFAULT_API_URL, DEFAULT_AUTH_URL } from '../../src/lib/env';

describe('env.resolveEnv', () => {
  it('returns defaults when nothing is set', () => {
    const env = resolveEnv({} as NodeJS.ProcessEnv);
    expect(env.apiUrl).toBe(DEFAULT_API_URL);
    expect(env.authUrl).toBe(DEFAULT_AUTH_URL);
    expect(env.clientId).toBeUndefined();
    expect(env.clientSecret).toBeUndefined();
    expect(env.noColor).toBe(false);
  });

  it('reads credentials and overrides from env', () => {
    const env = resolveEnv({
      SPOKE_CLIENT_ID: 'cid',
      SPOKE_CLIENT_SECRET: 'sec',
      SPOKE_API_URL: 'https://x.example',
      SPOKE_AUTH_URL: 'https://auth.example/t',
      SPOKE_PROFILE: 'prod',
      SPOKE_OUTPUT_FORMAT: 'json',
      NO_COLOR: '1',
    } as NodeJS.ProcessEnv);
    expect(env.clientId).toBe('cid');
    expect(env.clientSecret).toBe('sec');
    expect(env.apiUrl).toBe('https://x.example');
    expect(env.authUrl).toBe('https://auth.example/t');
    expect(env.profile).toBe('prod');
    expect(env.outputFormat).toBe('json');
    expect(env.noColor).toBe(true);
  });

  it('ignores unknown output formats', () => {
    const env = resolveEnv({ SPOKE_OUTPUT_FORMAT: 'fancy' } as NodeJS.ProcessEnv);
    expect(env.outputFormat).toBeUndefined();
  });
});
