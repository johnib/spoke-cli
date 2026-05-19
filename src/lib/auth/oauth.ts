import axios, { AxiosError } from 'axios';
import { AuthError } from '../errors';
import { CachedToken, readToken, writeToken, isExpired, clearToken } from './token-cache';
import { ActiveProfile } from './profiles';

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Fetches a fresh access token using the OAuth2 client_credentials flow.
 * Always hits the network — does not consult the cache. Callers should
 * prefer getToken() which handles caching + refresh.
 */
export async function fetchToken(profile: ActiveProfile): Promise<CachedToken> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: profile.clientId,
    client_secret: profile.clientSecret,
  }).toString();

  try {
    const res = await axios.post<TokenResponse>(profile.authUrl, body, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 15_000,
    });
    const data = res.data;
    if (!data?.access_token) {
      throw new AuthError('token endpoint returned no access_token');
    }
    const expiresIn = data.expires_in ?? 3600;
    return {
      access_token: data.access_token,
      token_type: data.token_type ?? 'Bearer',
      expires_at: Date.now() + expiresIn * 1000,
    };
  } catch (err) {
    if (err instanceof AuthError) throw err;
    const axErr = err as AxiosError;
    const status = axErr.response?.status;
    if (status === 401 || status === 403) {
      throw new AuthError('client credentials rejected by token endpoint');
    }
    throw new AuthError(
      `failed to fetch token: ${axErr.message || 'network error'}`,
      'Verify SPOKE_CLIENT_ID/SECRET and the auth URL.',
    );
  }
}

export async function getToken(profile: ActiveProfile, forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const cached = readToken(profile.name);
    if (cached && !isExpired(cached)) {
      return cached.access_token;
    }
  }
  const fresh = await fetchToken(profile);
  // Only persist if the profile is not ephemeral (env-only) — env-only users
  // typically don't want disk state.
  if (!profile.ephemeral) {
    writeToken(profile.name, fresh);
  }
  return fresh.access_token;
}

export function invalidateToken(profile: ActiveProfile): void {
  clearToken(profile.name);
}
