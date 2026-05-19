import { SpokeApiClient } from './client';
import * as calls from './calls';
import * as fs from 'node:fs';
import axios from 'axios';

/**
 * Spoke voicemails live as a nested `.voicemail` field on Call objects.
 * There is no /voicemails endpoint. This module presents voicemails as a
 * derived projection over GET /calls.
 *
 * Recording URLs are signed and expire 6 hours after the recording was made;
 * re-fetch the call to refresh them.
 */
export interface Voicemail {
  /** The voicemail's own id, distinct from the call id. */
  id: string;
  /** Parent call id — useful for fetching the full call context. */
  callId: string;
  /** Duration in SECONDS (not milliseconds like Call.duration). */
  duration?: number;
  durationText?: string;
  recordingUrl?: string;
  recordingUrlExpiresTimestamp?: number;
  transcription?: string;
  transcriptionConfidence?: number;

  // Useful surrounding context lifted off the parent call:
  from?: string;
  recipient?: string;
  recipientName?: string;
  receivedAt?: string;
}

function fromCall(c: calls.Call): Voicemail | null {
  if (!c.voicemail) return null;
  return {
    id: c.voicemail.id,
    callId: c.id,
    duration: c.voicemail.duration,
    durationText: c.voicemail.durationText,
    recordingUrl: c.voicemail.recordingUrl,
    recordingUrlExpiresTimestamp: c.voicemail.recordingUrlExpiresTimestamp,
    transcription: c.voicemail.transcription,
    transcriptionConfidence: c.voicemail.transcriptionConfidence,
    from: c.contactNumber ?? c.initiator,
    recipient: c.recipient,
    recipientName: c.directoryTarget?.displayName,
    receivedAt: c.startedAt,
  };
}

export interface ListOpts {
  since?: number;
  before?: number;
  limit?: number;
}

export async function list(client: SpokeApiClient, opts: ListOpts = {}): Promise<Voicemail[]> {
  // Pull recent calls and filter to those with a voicemail field.
  const arr = await calls.list(client, {
    since: opts.since,
    before: opts.before,
    limit: opts.limit ?? 200,
    includeRecordingUrl: true,
  });
  return arr.map(fromCall).filter((v): v is Voicemail => v !== null);
}

/**
 * Fetch a voicemail by id. Voicemail ids aren't a primary key on the API —
 * we walk recent calls and look for a matching voicemail.id. If you have the
 * parent call's id, prefer `getByCallId()`.
 */
export async function get(client: SpokeApiClient, id: string): Promise<Voicemail> {
  // First try treating the id as a callId — much faster than scanning.
  try {
    return await getByCallId(client, id);
  } catch {
    /* fall through */
  }
  const arr = await list(client);
  const match = arr.find((v) => v.id === id);
  if (!match) {
    const { NotFoundError } = await import('../errors');
    throw new NotFoundError(`voicemail ${id} not found in recent calls`);
  }
  return match;
}

export async function getByCallId(client: SpokeApiClient, callId: string): Promise<Voicemail> {
  const c = await calls.get(client, callId, { includeRecordingUrl: true });
  const vm = fromCall(c);
  if (!vm) {
    const { NotFoundError } = await import('../errors');
    throw new NotFoundError(`call ${callId} has no voicemail`);
  }
  return vm;
}

export async function transcript(client: SpokeApiClient, id: string): Promise<string> {
  const vm = await get(client, id);
  return vm.transcription ?? '';
}

export async function download(client: SpokeApiClient, id: string, outputPath: string): Promise<void> {
  const vm = await get(client, id);
  if (!vm.recordingUrl) {
    throw new Error('voicemail has no recording URL (signed URL may have expired — re-fetch the call)');
  }
  const res = await axios.get<ArrayBuffer>(vm.recordingUrl, { responseType: 'arraybuffer' });
  fs.writeFileSync(outputPath, Buffer.from(res.data));
}
