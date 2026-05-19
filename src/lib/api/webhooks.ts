import { SpokeApiClient } from './client';

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  description?: string;
  enabled?: boolean;
  mode?: 'production' | 'test';
  signingSecret?: string;
  createdAt?: string;
  createdTimestamp?: number;
}

/**
 * Full event catalog per the Spoke OpenAPI EventType enum (2026-05-14).
 * Spoke retries delivery for 24h with exponential backoff; signature header
 * is `x-spoke-signature: sha256=<HMAC>` of `${ms_timestamp}.${body}`.
 */
export const KNOWN_EVENTS = [
  'call.started',
  'call.answered',
  'call.not_answered',
  'call.hungup',
  'call.ended',
  'call.recording.available',
  'call.voicemail.available',
  'call.note.created',
  'call.highlight.created',
  'call.highlight.recording_available',
  'call.contact_assigned',
  'call.form.started',
  'call.form.submitted',
  'call.tariffed',
  'call.transcript.created',
  'call.transcription_completed',
  'contact.shared',
  'conversation.inactive',
  'conversation.closed',
  'conversation.message.created',
  'conversation.contact_assigned',
  'user.availability.updated',
  'team.availability.updated',
  'transcript.created',
  'content_analysis.completed',
] as const;

interface ListResponse {
  meta?: { next?: string | null };
  webhooks?: Webhook[];
}

export async function list(client: SpokeApiClient): Promise<Webhook[]> {
  const res = await client.get<ListResponse | Webhook[]>('/webhooks');
  if (Array.isArray(res.data)) return res.data;
  return res.data.webhooks ?? [];
}

export async function get(client: SpokeApiClient, id: string): Promise<Webhook> {
  const res = await client.get<Webhook>(`/webhooks/${encodeURIComponent(id)}`);
  return res.data;
}

export interface CreateOpts {
  url: string;
  events: string[];
  description?: string;
  enabled?: boolean;
  mode?: 'production' | 'test';
}

export async function create(client: SpokeApiClient, opts: CreateOpts): Promise<Webhook> {
  const res = await client.post<Webhook>('/webhooks', opts);
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
