export interface ResolvedEnv {
  clientId?: string;
  clientSecret?: string;
  apiUrl: string;
  authUrl: string;
  profile?: string;
  outputFormat?: 'json' | 'table' | 'human';
  noColor: boolean;
}

export const DEFAULT_API_URL = 'https://integration.spokephone.com';
export const DEFAULT_AUTH_URL = 'https://auth.spokephone.com/oauth/token';
export const TELEPHONY_API_URL = 'https://api.spokephone.com';

export function resolveEnv(env: NodeJS.ProcessEnv = process.env): ResolvedEnv {
  return {
    clientId: env.SPOKE_CLIENT_ID,
    clientSecret: env.SPOKE_CLIENT_SECRET,
    apiUrl: env.SPOKE_API_URL ?? DEFAULT_API_URL,
    authUrl: env.SPOKE_AUTH_URL ?? DEFAULT_AUTH_URL,
    profile: env.SPOKE_PROFILE,
    outputFormat: normalizeFormat(env.SPOKE_OUTPUT_FORMAT),
    noColor: Boolean(env.NO_COLOR) || env.NO_COLOR === '',
  };
}

function normalizeFormat(v?: string): 'json' | 'table' | 'human' | undefined {
  if (!v) return undefined;
  const lower = v.toLowerCase();
  if (lower === 'json' || lower === 'table' || lower === 'human') return lower;
  return undefined;
}
