import { SpokeApiClient } from './client';
import * as directory from './directory';
import { DirectoryEntry, Availability } from './directory';

/** A Spoke user. The `availability` nested object carries presence. */
export interface User extends DirectoryEntry {
  type: 'user';
  email?: string;
  loginStatus?: 'loggedIn' | 'loggedOut';
  availability?: Availability;
}

export interface ListOpts {
  email?: string;
  available?: boolean;
  next?: string;
  limit?: number;
}

interface ListResponse {
  meta?: { next?: string | null };
  users?: User[];
}

export async function list(client: SpokeApiClient, opts: ListOpts = {}): Promise<User[]> {
  const res = await client.get<ListResponse>('/users', {
    email: opts.email,
    limit: opts.limit,
    next: opts.next,
  });
  const users = res.data.users ?? [];
  if (opts.available) return users.filter((u) => u.availability?.status === 'available');
  return users;
}

/**
 * Look up a single user. Routing:
 *  - "@" in input → email filter on /users
 *  - UUID → /users/{id}
 *  - all digits → resolve via /directory?extension=N (since /users has no extension filter)
 *  - other → fuzzy directory match, then return the matching user entry
 */
export async function get(client: SpokeApiClient, idOrEmailOrExt: string): Promise<User> {
  if (idOrEmailOrExt.includes('@')) {
    const arr = await list(client, { email: idOrEmailOrExt });
    if (arr.length === 0) {
      const { NotFoundError } = await import('../errors');
      throw new NotFoundError(`no user with email ${idOrEmailOrExt}`);
    }
    return arr[0];
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrEmailOrExt)) {
    const res = await client.get<User>(`/users/${idOrEmailOrExt}`);
    return res.data;
  }
  // Extension or name → directory lookup. Directory entries carry most user fields,
  // so we can short-circuit without a second /users call.
  const entry = await directory.get(client, idOrEmailOrExt);
  if (entry.type !== 'user') {
    const { NotFoundError } = await import('../errors');
    throw new NotFoundError(`"${idOrEmailOrExt}" is a ${entry.type}, not a user`);
  }
  return entry as User;
}

export async function me(client: SpokeApiClient): Promise<User> {
  const res = await client.get<User>('/users/me');
  return res.data;
}

export async function availability(client: SpokeApiClient, idOrExt: string): Promise<{
  user: User;
  available: boolean;
  status: string;
  summary?: string;
}> {
  const u = await get(client, idOrExt);
  const a = u.availability;
  return {
    user: u,
    available: a?.status === 'available',
    status: a?.status ?? 'unknown',
    summary: a?.availabilitySummary,
  };
}
