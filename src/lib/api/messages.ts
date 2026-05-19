import { SpokeApiClient } from './client';

export interface Message {
  id?: string;
  direction?: 'inbound' | 'outbound' | string;
  channel?: 'sms' | 'whatsapp' | string;
  from?: string;
  to?: string;
  body?: string;
  status?: string;
  createdAt?: string | number;
  user?: { id?: string; extension?: string };
}

export interface ListOpts {
  direction?: 'inbound' | 'outbound';
  user?: string;
  channel?: 'sms' | 'whatsapp';
  since?: string | number;
  before?: string | number;
  next?: string;
  limit?: number;
}

export async function list(client: SpokeApiClient, opts: ListOpts = {}): Promise<Message[]> {
  const res = await client.get<{ entries?: Message[] } | Message[]>('/conversationMessages', {
    direction: opts.direction,
    user: opts.user,
    channel: opts.channel,
    since: opts.since,
    before: opts.before,
    next: opts.next,
    limit: opts.limit,
  });
  return Array.isArray(res.data) ? res.data : res.data.entries ?? [];
}

export async function get(client: SpokeApiClient, id: string): Promise<Message> {
  const res = await client.get<Message>(`/conversationMessages/${encodeURIComponent(id)}`);
  return res.data;
}

export interface SendOpts {
  to: string;
  from: string;
  body: string;
  channel?: 'sms' | 'whatsapp';
}

export async function send(client: SpokeApiClient, opts: SendOpts): Promise<Message> {
  const res = await client.post<Message>('/conversationMessages', {
    to: opts.to,
    from: opts.from,
    body: opts.body,
    channel: opts.channel ?? 'sms',
  });
  return res.data;
}
