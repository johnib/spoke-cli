import { SpokeApiClient } from './client';
import * as fs from 'node:fs';
import axios from 'axios';

export interface Voicemail {
  id?: string;
  recipientId?: string;
  recipientName?: string;
  from?: string;
  duration?: number;
  receivedAt?: string | number;
  read?: boolean;
  transcript?: string;
  recordingUrl?: string;
}

export interface ListOpts {
  user?: string;
  group?: string;
  unread?: boolean;
  next?: string;
  limit?: number;
}

/**
 * Voicemails are a derived view of calls with the voicemail outcome. We list
 * /calls and filter to voicemail entries — the API surfaces them via the
 * `voicemail` flag (and recordingUrl in the response).
 */
export async function list(client: SpokeApiClient, opts: ListOpts = {}): Promise<Voicemail[]> {
  const res = await client.get<{ entries?: Voicemail[] } | Voicemail[]>('/voicemails', {
    user: opts.user,
    group: opts.group,
    unread: opts.unread ? true : undefined,
    next: opts.next,
    limit: opts.limit,
  });
  return Array.isArray(res.data) ? res.data : res.data.entries ?? [];
}

export async function get(client: SpokeApiClient, id: string): Promise<Voicemail> {
  const res = await client.get<Voicemail>(`/voicemails/${encodeURIComponent(id)}`);
  return res.data;
}

export async function transcript(client: SpokeApiClient, id: string): Promise<string> {
  const vm = await get(client, id);
  if (vm.transcript) return vm.transcript;
  // Spoke also exposes transcripts via /transcripts/{transcriptId}.
  const res = await client.get<{ text?: string; transcript?: string }>(
    `/transcripts/${encodeURIComponent(id)}`,
  );
  return res.data.text ?? res.data.transcript ?? '';
}

export async function download(client: SpokeApiClient, id: string, outputPath: string): Promise<void> {
  const vm = await get(client, id);
  if (!vm.recordingUrl) {
    throw new Error('voicemail has no recording URL');
  }
  const res = await axios.get<ArrayBuffer>(vm.recordingUrl, { responseType: 'arraybuffer' });
  fs.writeFileSync(outputPath, Buffer.from(res.data));
}
