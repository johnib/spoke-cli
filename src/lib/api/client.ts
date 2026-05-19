import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { ActiveProfile, resolveActiveProfile } from '../auth/profiles';
import { getToken, invalidateToken } from '../auth/oauth';
import { fromHttpStatus, SpokeError } from '../errors';
import { logger } from '../logger';
import { DEFAULT_API_URL, DEFAULT_AUTH_URL } from '../env';

export interface ClientOptions {
  profile?: string;
  /** Force `--dry-run` semantics — log request and skip the network call. */
  dryRun?: boolean;
  /** Override the active profile resolution (used by `spoke auth login` flow tests). */
  active?: ActiveProfile;
}

export interface ApiRequest {
  method: string;
  path: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
  /** Hit a different base host (e.g. https://api.spokephone.com for /telephony). */
  baseUrlOverride?: string;
  /** Set true to NOT auto-refresh on 401 (used by the refresh-and-retry itself). */
  noRetry?: boolean;
}

export interface ApiResponse<T = unknown> {
  status: number;
  data: T;
  headers: Record<string, string>;
}

export class SpokeApiClient {
  readonly profile: ActiveProfile;
  private readonly dryRun: boolean;
  private readonly axios: AxiosInstance;

  constructor(opts: ClientOptions = {}) {
    this.dryRun = opts.dryRun ?? false;
    if (opts.active) {
      this.profile = opts.active;
    } else if (this.dryRun) {
      // Dry-run doesn't need real creds — synthesize a placeholder so we can
      // still print the resolved request URL.
      this.profile = {
        name: opts.profile ?? 'dry-run',
        clientId: 'DRY_RUN',
        clientSecret: 'DRY_RUN',
        apiUrl: DEFAULT_API_URL,
        authUrl: DEFAULT_AUTH_URL,
        ephemeral: true,
      };
    } else {
      this.profile = resolveActiveProfile(opts.profile);
    }
    this.axios = axios.create({
      baseURL: this.profile.apiUrl,
      timeout: 30_000,
      validateStatus: () => true,
    });
  }

  async request<T = unknown>(req: ApiRequest): Promise<ApiResponse<T>> {
    const url = req.path.startsWith('http')
      ? req.path
      : (req.baseUrlOverride ?? this.profile.apiUrl) + ensureLeadingSlash(req.path);
    const method = (req.method || 'GET').toUpperCase();

    if (this.dryRun) {
      logger.info(`[dry-run] ${method} ${url}`);
      if (req.query) logger.info(`[dry-run] query: ${JSON.stringify(req.query)}`);
      if (req.body !== undefined) logger.info(`[dry-run] body: ${JSON.stringify(req.body)}`);
      return { status: 200, data: { dryRun: true } as any, headers: {} };
    }

    const token = await getToken(this.profile);
    const config: AxiosRequestConfig = {
      method,
      url,
      params: scrubParams(req.query),
      data: req.body,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...req.headers,
      },
    };

    logger.debug(`HTTP ${method} ${url}`);
    const res = await this.axios.request(config);
    logger.debug(`<- ${res.status}`);

    if (res.status === 401 && !req.noRetry) {
      // One-shot retry: refresh token, try again.
      invalidateToken(this.profile);
      const fresh = await getToken(this.profile, true);
      const res2 = await this.axios.request({
        ...config,
        headers: { ...config.headers, Authorization: `Bearer ${fresh}` },
      });
      if (res2.status >= 200 && res2.status < 300) {
        return toResponse<T>(res2);
      }
      throw mapError(res2.status, res2.data);
    }

    if (res.status >= 200 && res.status < 300) {
      return toResponse<T>(res);
    }
    throw mapError(res.status, res.data);
  }

  get<T = unknown>(path: string, query?: ApiRequest['query']): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'GET', path, query });
  }
  post<T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'POST', path, body });
  }
  put<T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'PUT', path, body });
  }
  patch<T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'PATCH', path, body });
  }
  delete<T = unknown>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'DELETE', path });
  }

  /**
   * Iterate cursor-paginated endpoints. Spoke uses `next` cursors with `?limit`.
   * Yields each page's array (caller is responsible for which field holds it).
   */
  async *paginate<T = unknown>(
    path: string,
    extract: (page: any) => { items: T[]; next?: string | null },
    query?: ApiRequest['query'],
  ): AsyncGenerator<T[]> {
    let cursor: string | undefined;
    do {
      const merged: ApiRequest['query'] = { ...query };
      if (cursor) merged.next = cursor;
      const res = await this.get<any>(path, merged);
      const { items, next } = extract(res.data);
      yield items;
      cursor = next ?? undefined;
    } while (cursor);
  }

  async collectPages<T = unknown>(
    path: string,
    extract: (page: any) => { items: T[]; next?: string | null },
    query?: ApiRequest['query'],
  ): Promise<T[]> {
    const out: T[] = [];
    for await (const batch of this.paginate(path, extract, query)) {
      out.push(...batch);
    }
    return out;
  }
}

function toResponse<T>(res: { status: number; data: T; headers: any }): ApiResponse<T> {
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(res.headers ?? {})) {
    headers[k] = Array.isArray(v) ? v.join(',') : String(v);
  }
  return { status: res.status, data: res.data, headers };
}

function mapError(status: number, body: unknown): SpokeError {
  return fromHttpStatus(status, body);
}

function ensureLeadingSlash(p: string): string {
  return p.startsWith('/') ? p : '/' + p;
}

function scrubParams(query?: ApiRequest['query']): Record<string, string | number | boolean> | undefined {
  if (!query) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    out[k] = v;
  }
  return out;
}
