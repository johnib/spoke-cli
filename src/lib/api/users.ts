import { SpokeApiClient } from './client';

export interface User {
  id?: string;
  extension?: string;
  email?: string;
  displayName?: string;
  status?: string;
  available?: boolean;
  devices?: Array<{ id?: string; name?: string; type?: string; status?: string }>;
  groups?: Array<{ id?: string; name?: string }>;
}

export interface ListOpts {
  email?: string;
  available?: boolean;
  next?: string;
  limit?: number;
}

export async function list(client: SpokeApiClient, opts: ListOpts = {}): Promise<User[]> {
  const res = await client.get<{ entries?: User[]; users?: User[] } | User[]>('/users', {
    email: opts.email,
    limit: opts.limit,
    next: opts.next,
  });
  const arr = Array.isArray(res.data)
    ? res.data
    : (res.data as any).entries ?? (res.data as any).users ?? [];
  if (opts.available) return arr.filter((u: User) => u.available || u.status === 'available');
  return arr;
}

export async function get(client: SpokeApiClient, idOrEmail: string): Promise<User> {
  if (idOrEmail.includes('@')) {
    const users = await list(client, { email: idOrEmail });
    if (users.length === 0) {
      const res = await client.get<User>(`/users/${encodeURIComponent(idOrEmail)}`);
      return res.data;
    }
    return users[0];
  }
  const res = await client.get<User>(`/users/${encodeURIComponent(idOrEmail)}`);
  return res.data;
}

export async function me(client: SpokeApiClient): Promise<User> {
  // Spoke exposes the credential's own user via `/users/me` when available.
  const res = await client.get<User>('/users/me');
  return res.data;
}

export async function availability(client: SpokeApiClient, id: string): Promise<{
  user: User;
  available: boolean;
  status: string;
}> {
  const u = await get(client, id);
  return {
    user: u,
    available: Boolean(u.available || u.status === 'available'),
    status: u.status ?? (u.available ? 'available' : 'unavailable'),
  };
}

export async function setAvailability(
  client: SpokeApiClient,
  id: string,
  status: 'available' | 'busy' | 'unavailable',
): Promise<User> {
  // NOTE: This endpoint is best-guess against the OpenAPI shape; verify against
  // the production API when wiring live.
  const res = await client.patch<User>(`/users/${encodeURIComponent(id)}`, { status });
  return res.data;
}

export function redirectUrl(id: string, returnTo?: string): string {
  const base = `https://spoke-api-service.twil.io/redirect`;
  const qs = new URLSearchParams({ ext: id });
  if (returnTo) qs.set('returnTo', returnTo);
  return `${base}?${qs.toString()}`;
}
