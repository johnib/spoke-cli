import { SpokeApiClient } from './client';
import { TELEPHONY_API_URL } from '../env';

export interface Call {
  id?: string;
  sid?: string;
  from?: string;
  to?: string;
  status?: string;
  direction?: 'inbound' | 'outbound' | string;
  startTime?: string | number;
  endTime?: string | number;
  duration?: number;
  recordingUrl?: string;
  voicemail?: boolean;
  missed?: boolean;
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

export async function list(client: SpokeApiClient, opts: ListOpts = {}): Promise<Call[]> {
  const res = await client.get<{ entries?: Call[]; next?: string } | Call[]>('/calls', {
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
  return Array.isArray(res.data) ? res.data : res.data.entries ?? [];
}

export async function get(
  client: SpokeApiClient,
  id: string,
  opts: { includeRecordingUrl?: boolean } = {},
): Promise<Call> {
  const res = await client.get<Call>(`/calls/${encodeURIComponent(id)}`, {
    includeRecordingUrl: opts.includeRecordingUrl,
  });
  return res.data;
}

export interface RedirectOpts {
  extension?: string;
  /** PSTN number with +E164 prefix; used when not redirecting to an extension. */
  number?: string;
  returnTo?: 'flow' | 'taskQueue' | 'postEndpoint';
  returnToId?: string;
  priority?: number;
  timeout?: number;
  nextOfferTimeout?: number;
  sendToVoicemail?: boolean;
  organisationId?: string;
  /** Additional `x-...` passthrough params. */
  passthrough?: Record<string, string>;
}

/**
 * Transfer/redirect a live call to a Spoke extension or PSTN number. Uses the
 * /telephony/redirect endpoint on api.spokephone.com.
 */
export async function redirect(client: SpokeApiClient, callId: string, opts: RedirectOpts) {
  const body: Record<string, unknown> = {
    callId,
    extension: opts.extension,
    number: opts.number,
    returnTo: opts.returnTo,
    returnToId: opts.returnToId,
    priority: opts.priority,
    timeout: opts.timeout,
    nextOfferTimeout: opts.nextOfferTimeout,
    sendToVoicemail: opts.sendToVoicemail,
    organisationId: opts.organisationId,
  };
  if (opts.passthrough) {
    for (const [k, v] of Object.entries(opts.passthrough)) {
      body[k.startsWith('x-') ? k : `x-${k}`] = v;
    }
  }
  // Strip undefined.
  for (const k of Object.keys(body)) {
    if (body[k] === undefined) delete body[k];
  }
  const res = await client.request({
    method: 'POST',
    path: '/telephony/redirect',
    baseUrlOverride: TELEPHONY_API_URL,
    body,
  });
  return res.data;
}

export async function hangup(client: SpokeApiClient, callId: string) {
  // Hangup is modelled as a redirect with no destination + endCall=true.
  const res = await client.request({
    method: 'POST',
    path: '/telephony/redirect',
    baseUrlOverride: TELEPHONY_API_URL,
    body: { callId, endCall: true },
  });
  return res.data;
}

export function twimlRedirectUrl(opts: { extension: string; returnTo?: string }): string {
  const qs = new URLSearchParams({ ext: opts.extension });
  if (opts.returnTo) qs.set('returnTo', opts.returnTo);
  return `https://spoke-api-service.twil.io/redirect?${qs.toString()}`;
}
