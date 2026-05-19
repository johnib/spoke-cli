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

export async function list(client: SpokeApiClient, opts: ListOpts = {}): Promise<Call[]> {
  const res = await client.get<ListResponse>('/calls', {
    includeActive: opts.includeActive,
    includeRecordingUrl: opts.includeRecordingUrl,
    since: opts.since,
    before: opts.before,
    modified: opts.modified,
    contactNumber: opts.contactNumber,
    sortOrder: opts.sortOrder,
    next: opts.next,
    limit: opts.limit,
  });
  return res.data.calls ?? [];
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
