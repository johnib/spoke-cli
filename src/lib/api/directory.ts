import { SpokeApiClient } from './client';

/** A Spoke directory entry — covers users, teams (call groups), and devices. */
export interface DirectoryEntry {
  /** Opaque UUID of the entry. */
  id: string;
  /** Display name (e.g. "Alice Cohen" or "Sales Team"). */
  displayName: string;
  /** Numeric extension as a string. */
  extension?: string;
  /** Discriminator. Real values: "user" | "team" | "device" | "trunkUser" | "trunkDevice" | "trunkQueue". */
  type: 'user' | 'team' | 'device' | 'trunkUser' | 'trunkDevice' | 'trunkQueue' | string;
  /** Pre-built TwiML redirect URL (the URL Twilio fetches to bridge into Spoke). */
  twimlRedirectUrl?: string;
  /** Whether the entry is hidden from the default directory view. */
  isHidden?: boolean;
  ivrKeyCode?: number;
  phoneNumbers?: Array<{ phoneNumber: string }>;

  // --- user-only fields ---
  email?: string;
  firstName?: string;
  lastName?: string;
  mobile?: string | null;
  jobTitle?: string | null;
  location?: string | null;
  /** Employment status — "active", "invited", "suspended", etc. NOT presence. */
  status?: string;
  loginStatus?: 'loggedIn' | 'loggedOut';
  teams?: string[];
  /** Nested presence object. Present on user + team entries. */
  availability?: Availability;

  // --- team-only fields ---
  teamMembers?: DirectoryEntry[];
}

export interface Availability {
  status: 'available' | 'busy' | 'offline' | string;
  statusAt?: string;
  statusTimestamp?: number;
  timezone?: string;
  /** Display-only human summary, e.g. "Available", "0 people". */
  availabilitySummary?: string;
  /** Team-only: count of available members. */
  totalAvailable?: number;
  /** Team-only: count of all members. */
  totalMembers?: number;
  notAvailableRule?: string | null;
  notAvailableReason?: string | null;
  endAt?: string | null;
  endTimestamp?: number | null;
  callId?: string;
  vendor?: string;
  vendorCallId?: string;
}

export interface ListOpts {
  type?: 'user' | 'group' | 'team' | 'device' | 'trunkDevice' | 'trunkUser' | 'trunkQueue';
  available?: boolean;
  hidden?: boolean;
  next?: string;
  limit?: number;
  extension?: string;
  phoneNumber?: string;
  ivrKey?: string;
}

/** Map user-facing type names ("group") to wire values ("team"). */
export function normalizeType(t?: string): string | undefined {
  if (!t) return undefined;
  if (t === 'group' || t === 'callGroup') return 'team';
  return t;
}

interface ListResponse {
  meta?: { next?: string | null };
  entries?: DirectoryEntry[];
}

export async function list(client: SpokeApiClient, opts: ListOpts = {}): Promise<DirectoryEntry[]> {
  const res = await client.get<ListResponse>('/directory', {
    extension: opts.extension,
    phoneNumber: opts.phoneNumber,
    ivrKey: opts.ivrKey,
    includeHiddenCallGroups: opts.hidden ? true : undefined,
    limit: opts.limit,
    next: opts.next,
  });
  const entries = res.data.entries ?? [];
  const typeFilter = normalizeType(opts.type);
  return entries.filter((e) => {
    if (typeFilter && e.type !== typeFilter) return false;
    if (opts.available && e.availability?.status !== 'available') return false;
    if (!opts.hidden && e.isHidden) return false;
    return true;
  });
}

/**
 * Look up a directory entry by id (UUID), extension (digits), or name (fuzzy).
 *  - UUIDs hit /directory/{id} directly.
 *  - All-digit input is treated as an extension and fetched via /directory?extension=N.
 *  - Anything else lists the directory and fuzzy-matches displayName.
 */
export async function get(client: SpokeApiClient, idOrNameOrExt: string): Promise<DirectoryEntry> {
  // UUID-shaped → direct lookup
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrNameOrExt)) {
    const res = await client.get<DirectoryEntry>(`/directory/${idOrNameOrExt}`);
    return res.data;
  }
  // Numeric → treat as extension; the docs say the only path is the listing endpoint.
  if (/^\d+$/.test(idOrNameOrExt)) {
    const arr = await list(client, { extension: idOrNameOrExt });
    if (arr.length === 0) {
      const { NotFoundError } = await import('../errors');
      throw new NotFoundError(`extension ${idOrNameOrExt} not found`);
    }
    return arr[0];
  }
  // Otherwise fuzzy-match against the directory listing.
  const all = await list(client, { limit: 1000 });
  const lower = idOrNameOrExt.toLowerCase();
  const match =
    all.find((e) => (e.displayName ?? '').toLowerCase() === lower) ??
    all.find((e) => (e.displayName ?? '').toLowerCase().includes(lower));
  if (!match) {
    const { NotFoundError } = await import('../errors');
    throw new NotFoundError(`no directory entry matching "${idOrNameOrExt}"`);
  }
  return match;
}

export async function search(
  client: SpokeApiClient,
  query: string,
  opts: ListOpts = {},
): Promise<DirectoryEntry[]> {
  const all = await list(client, { ...opts, limit: opts.limit ?? 1000 });
  const lower = query.toLowerCase();
  return all.filter((e) => {
    return (
      (e.displayName ?? '').toLowerCase().includes(lower) ||
      (e.extension ?? '').includes(lower) ||
      (e.email ?? '').toLowerCase().includes(lower)
    );
  });
}
