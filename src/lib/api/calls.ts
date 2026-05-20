import { SpokeApiClient } from './client';

export interface Call {
  id: string;
  /** Twilio parent CallSid (provider's call identifier). */
  vendorCallId?: string;
  vendor?: 'twilio' | string;
  direction: 'inbound' | 'outbound' | string;
  /** Call lifecycle status: started, offered, missed, accepted, ended, abandoned, blocked. */
  status?: string;
  outcome?: { status?: string; reason?: string | null };
  isInternal?: boolean;
  isConference?: boolean;

  /** Caller-side info. */
  initiator?: string;
  /** External contact's E.164 number (or "ANONYMOUS" / null for internal calls). */
  contactNumber?: string;
  /** The Spoke-side public number that was dialled. */
  companyNumber?: string;
  /** The extension the call was routed to (string form). */
  recipient?: string;

  /** Duration in MILLISECONDS. */
  duration?: number;
  durationText?: string;
  /** Wait time before answer, in milliseconds. */
  waitTime?: number;
  waitTimeText?: string;

  startedAt?: string;
  answeredAt?: string;
  endedAt?: string;
  lastModifiedAt?: string;

  assignedUser?: any;
  assignedCallGroup?: any;
  directoryTarget?: { id?: string; extension?: string; displayName?: string; type?: string };
  parties?: any[];
  recordings?: Array<{ id: string; recordingUrl?: string; duration?: number }>;
  /** Present only when the inbound call landed on a user's voicemail. Duration here is SECONDS. */
  voicemail?: {
    id: string;
    duration?: number;
    durationText?: string;
    recordingUrl?: string;
    recordingUrlExpiresTimestamp?: number;
    transcription?: string;
    transcriptionConfidence?: number;
  };
  passthroughParameters?: Record<string, string>;
}

export interface ListOpts {
  includeActive?: boolean;
  includeRecordingUrl?: boolean;
  since?: number;
  before?: number;
  modified?: number;
  contactNumber?: string;
  sortOrder?: 'ascending' | 'descending';
  next?: string;
  limit?: number;
}

interface ListResponse {
  meta?: { next?: string | null };
  calls?: Call[];
}

/**
 * Spoke timestamp fields are milliseconds-since-epoch. Most Unix tooling
 * emits seconds, so we accept either: values below ~year-5138-in-seconds
 * (1e12) are treated as seconds and multiplied to ms.
 */
export function toMs(ts: number | undefined): number | undefined {
  if (ts === undefined || ts === null) return undefined;
  return ts < 1e12 ? ts * 1000 : ts;
}

export async function list(client: SpokeApiClient, opts: ListOpts = {}): Promise<Call[]> {
  const res = await client.get<ListResponse>('/calls', {
    includeActive: opts.includeActive,
    includeRecordingUrl: opts.includeRecordingUrl,
    since: toMs(opts.since),
    before: toMs(opts.before),
    modified: toMs(opts.modified),
    contactNumber: opts.contactNumber,
    sortOrder: opts.sortOrder,
    next: opts.next,
    limit: opts.limit,
  });
  return res.data.calls ?? [];
}

/**
 * Fetch ALL pages of /calls in the given window, following the meta.next
 * cursor until exhausted. `onPage` is invoked after each page is collected
 * — useful for progress reporting on long ranges.
 */
export async function listAll(
  client: SpokeApiClient,
  opts: ListOpts = {},
  onPage?: (pageCount: number, totalSoFar: number) => void,
): Promise<Call[]> {
  const all: Call[] = [];
  let pageIdx = 0;
  let cursor: string | undefined = opts.next;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await client.get<ListResponse>('/calls', {
      includeActive: opts.includeActive,
      includeRecordingUrl: opts.includeRecordingUrl,
      since: toMs(opts.since),
      before: toMs(opts.before),
      modified: toMs(opts.modified),
      contactNumber: opts.contactNumber,
      sortOrder: opts.sortOrder,
      next: cursor,
      limit: opts.limit ?? 1000,
    });
    const batch = res.data.calls ?? [];
    all.push(...batch);
    pageIdx += 1;
    if (onPage) onPage(pageIdx, all.length);
    const next = res.data.meta?.next ?? null;
    if (!next || batch.length === 0) break;
    cursor = next;
  }
  return all;
}

export async function get(
  client: SpokeApiClient,
  id: string,
  opts: { includeRecordingUrl?: boolean } = {},
): Promise<Call> {
  const res = await client.get<Call>(
    `/calls/${encodeURIComponent(id)}`,
    opts.includeRecordingUrl ? { includeRecordingUrl: true } : undefined,
  );
  return res.data;
}

/**
 * Build the documented TwiML redirect URL on api.spokephone.com. This is the
 * URL Twilio fetches to redirect a Twilio-managed call into Spoke — it is NOT
 * a Spoke API endpoint. Prefer reading `twimlRedirectUrl` from a directory
 * entry when possible, since that URL also includes the organisationId.
 */
export function twimlRedirectUrl(opts: {
  extension: string;
  organisationId?: string;
  returnTo?: 'flow' | 'taskQueue' | 'postEndpoint';
  returnToId?: string;
  priority?: number;
  timeout?: number;
  nextOfferTimeout?: number;
  sendToVoicemail?: boolean;
}): string {
  // Per docs the parameter ORDER matters because the handler signature-validates the URL.
  const params: Array<[string, string]> = [];
  params.push(['extension', opts.extension]);
  if (opts.nextOfferTimeout !== undefined) params.push(['nextOfferTimeout', String(opts.nextOfferTimeout)]);
  if (opts.organisationId) params.push(['organisationId', opts.organisationId]);
  if (opts.priority !== undefined) params.push(['priority', String(opts.priority)]);
  if (opts.returnTo) params.push(['returnTo', opts.returnTo]);
  if (opts.returnToId) params.push(['returnToId', opts.returnToId]);
  if (opts.sendToVoicemail !== undefined) params.push(['sendToVoicemail', String(opts.sendToVoicemail)]);
  if (opts.timeout !== undefined) params.push(['timeout', String(opts.timeout)]);
  const qs = params.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  return `https://api.spokephone.com/telephony/redirect?${qs}`;
}

/** Format a millisecond duration as HH:MM:SS. */
export function formatDurationMs(ms?: number): string {
  if (!ms) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600).toString().padStart(2, '0');
  const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}
