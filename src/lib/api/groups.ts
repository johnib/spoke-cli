import { SpokeApiClient } from './client';
import * as directory from './directory';
import { DirectoryEntry, Availability } from './directory';

/**
 * A Spoke team (call group / hunt group). Member list is `teamMembers`,
 * member availability counts are on the nested `availability` object.
 */
export interface Team extends DirectoryEntry {
  type: 'team';
  teamMembers?: DirectoryEntry[];
  availability?: Availability;
}

export interface ListOpts {
  available?: boolean;
  hidden?: boolean;
  next?: string;
  limit?: number;
}

export async function list(client: SpokeApiClient, opts: ListOpts = {}): Promise<Team[]> {
  const entries = await directory.list(client, {
    type: 'team',
    available: opts.available,
    hidden: opts.hidden,
    limit: opts.limit ?? 1000,
    next: opts.next,
  });
  return entries as Team[];
}

export async function get(client: SpokeApiClient, idOrExt: string): Promise<Team> {
  const entry = await directory.get(client, idOrExt);
  return entry as Team;
}

export async function members(
  client: SpokeApiClient,
  idOrExt: string,
  opts: { available?: boolean } = {},
): Promise<DirectoryEntry[]> {
  const g = await get(client, idOrExt);
  const ms = g.teamMembers ?? [];
  if (opts.available) return ms.filter((m) => m.availability?.status === 'available');
  return ms;
}

export async function availability(
  client: SpokeApiClient,
  idOrExt: string,
): Promise<{ group: Team; total: number; available: number; summary?: string }> {
  const g = await get(client, idOrExt);
  // Prefer the server-computed counts when present.
  const a = g.availability;
  const total = a?.totalMembers ?? (g.teamMembers ?? []).length;
  const avail =
    a?.totalAvailable ??
    (g.teamMembers ?? []).filter((m) => m.availability?.status === 'available').length;
  return { group: g, total, available: avail, summary: a?.availabilitySummary };
}
