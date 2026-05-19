import { SpokeApiClient } from './client';

export interface DirectoryEntry {
  /** The Spoke directory entry id — typically the extension. */
  id?: string;
  extension?: string;
  displayName?: string;
  type?: 'user' | 'callGroup' | 'device' | string;
  status?: string;
  hidden?: boolean;
  available?: boolean;
  devices?: Array<{ name?: string; status?: string; type?: string }>;
  members?: Array<DirectoryEntry>;
  twimlUrl?: string;
  routing?: string;
  voicemail?: boolean;
}

export interface DirectoryListResponse {
  entries?: DirectoryEntry[];
  next?: string | null;
}

export interface ListOpts {
  type?: 'user' | 'group' | 'device';
  available?: boolean;
  hidden?: boolean;
  page?: number;
  limit?: number;
  next?: string;
}

/**
 * Normalise the type filter to the OpenAPI vocabulary.
 *   - "group" → "callGroup"
 *   - "user", "device" pass through
 */
export function normalizeType(t?: string): string | undefined {
  if (!t) return undefined;
  if (t === 'group') return 'callGroup';
  return t;
}

export async function list(client: SpokeApiClient, opts: ListOpts = {}): Promise<DirectoryEntry[]> {
  const res = await client.get<DirectoryListResponse | DirectoryEntry[]>('/directory', {
    limit: opts.limit,
    next: opts.next,
    includeHiddenCallGroups: opts.hidden ? true : undefined,
  });
  const entries = Array.isArray(res.data) ? res.data : res.data.entries ?? [];
  const typeFilter = normalizeType(opts.type);
  return entries.filter((e) => {
    if (typeFilter && e.type !== typeFilter) return false;
    if (opts.available && !(e.available || e.status === 'available')) return false;
    if (!opts.hidden && e.hidden) return false;
    return true;
  });
}

export async function get(client: SpokeApiClient, idOrName: string): Promise<DirectoryEntry> {
  // Try direct lookup first.
  if (/^\d+$/.test(idOrName)) {
    const res = await client.get<DirectoryEntry>(`/directory/${encodeURIComponent(idOrName)}`);
    return res.data;
  }
  // Otherwise: list and fuzzy-match name.
  const all = await list(client);
  const lower = idOrName.toLowerCase();
  const match =
    all.find((e) => (e.displayName ?? '').toLowerCase() === lower) ??
    all.find((e) => (e.displayName ?? '').toLowerCase().includes(lower));
  if (!match) {
    // Final fallback: ask API directly — the server may resolve symbolic IDs.
    const res = await client.get<DirectoryEntry>(`/directory/${encodeURIComponent(idOrName)}`);
    return res.data;
  }
  return match;
}

export async function search(
  client: SpokeApiClient,
  query: string,
  opts: ListOpts = {},
): Promise<DirectoryEntry[]> {
  const all = await list(client, opts);
  const lower = query.toLowerCase();
  return all.filter((e) => {
    return (
      (e.displayName ?? '').toLowerCase().includes(lower) ||
      (e.extension ?? '').includes(lower) ||
      (e.id ?? '').toLowerCase().includes(lower)
    );
  });
}
