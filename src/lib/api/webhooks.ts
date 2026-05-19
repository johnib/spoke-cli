import { SpokeApiClient } from './client';

export interface Webhook {
  id?: string;
  url: string;
  events: string[];
  status?: 'active' | 'disabled' | string;
  secret?: string;
}

export const KNOWN_EVENTS = [
  'call.started',
  'call.answered',
  'call.ended',
  'call.transferred',
  'call.missed',
  'call.voicemail',
  'message.received',
  'message.sent',
  'user.availability.changed',
  'group.availability.changed',
] as const;

export async function list(client: SpokeApiClient): Promise<Webhook[]> {
  const res = await client.get<{ entries?: Webhook[] } | Webhook[]>('/webhooks');
  return Array.isArray(res.data) ? res.data : res.data.entries ?? [];
}

export async function get(client: SpokeApiClient, id: string): Promise<Webhook> {
  const res = await client.get<Webhook>(`/webhooks/${encodeURIComponent(id)}`);
  return res.data;
}

export interface CreateOpts {
  url: string;
  events: string[];
  secret?: string;
}

export async function create(client: SpokeApiClient, opts: CreateOpts): Promise<Webhook> {
  const res = await client.post<Webhook>('/webhooks', {
    url: opts.url,
    events: opts.events,
    secret: opts.secret,
  });
  return res.data;
}

export async function update(
  client: SpokeApiClient,
  id: string,
  opts: Partial<CreateOpts>,
): Promise<Webhook> {
  const res = await client.put<Webhook>(`/webhooks/${encodeURIComponent(id)}`, opts);
  return res.data;
}

export async function remove(client: SpokeApiClient, id: string): Promise<void> {
  await client.delete(`/webhooks/${encodeURIComponent(id)}`);
}

export async function replay(client: SpokeApiClient, id: string, eventId: string): Promise<void> {
  await client.post(`/webhooks/${encodeURIComponent(id)}/replay`, { eventId });
}
