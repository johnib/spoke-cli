import { SpokeApiClient } from './client';
import * as directory from './directory';
import { DirectoryEntry } from './directory';

export interface Group extends DirectoryEntry {
  routing?: string;
  members?: DirectoryEntry[];
}

export interface ListOpts {
  available?: boolean;
  hidden?: boolean;
  next?: string;
  limit?: number;
}

export async function list(client: SpokeApiClient, opts: ListOpts = {}): Promise<Group[]> {
  const entries = await directory.list(client, {
    type: 'group',
    available: opts.available,
    hidden: opts.hidden,
    next: opts.next,
    limit: opts.limit,
  });
  return entries as Group[];
}

export async function get(client: SpokeApiClient, idOrName: string): Promise<Group> {
  const entry = await directory.get(client, idOrName);
  if (entry.type && entry.type !== 'callGroup') {
    // Still return it; the caller decides.
  }
  return entry as Group;
}

export async function members(
  client: SpokeApiClient,
  idOrName: string,
  opts: { available?: boolean } = {},
): Promise<DirectoryEntry[]> {
  const g = await get(client, idOrName);
  const ms = g.members ?? [];
  if (opts.available) return ms.filter((m) => m.available || m.status === 'available');
  return ms;
}

export async function availability(
  client: SpokeApiClient,
  idOrName: string,
): Promise<{ group: Group; total: number; available: number }> {
  const g = await get(client, idOrName);
  const ms = g.members ?? [];
  const avail = ms.filter((m) => m.available || m.status === 'available').length;
  return { group: g, total: ms.length, available: avail };
}

export function redirectUrl(id: string, returnTo?: string): string {
  const base = `https://spoke-api-service.twil.io/redirect`;
  const qs = new URLSearchParams({ ext: id, group: '1' });
  if (returnTo) qs.set('returnTo', returnTo);
  return `${base}?${qs.toString()}`;
}
