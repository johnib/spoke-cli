import { SpokeApiClient } from './client';
import * as directory from './directory';
import { DirectoryEntry } from './directory';

/**
 * In the public API, "devices" are simply directory entries with type "device"
 * (standalone SIP devices) or "trunkDevice" (devices nested under a SIP trunk).
 * There is no dedicated /devices endpoint — we list /directory and filter.
 */
export interface Device extends DirectoryEntry {
  type: 'device' | 'trunkDevice';
}

export interface ListOpts {
  user?: string;
  type?: 'device' | 'trunkDevice';
  next?: string;
  limit?: number;
}

export async function list(client: SpokeApiClient, opts: ListOpts = {}): Promise<Device[]> {
  const entries = await directory.list(client, {
    type: opts.type ?? 'device',
    limit: opts.limit ?? 1000,
    next: opts.next,
  });
  let filtered = entries as Device[];
  // If user-filter was passed, include trunkDevices too and match by displayName/email.
  if (opts.user) {
    const lower = opts.user.toLowerCase();
    filtered = filtered.filter(
      (d) =>
        (d.displayName ?? '').toLowerCase().includes(lower) ||
        (d.email ?? '').toLowerCase().includes(lower),
    );
  }
  return filtered;
}

export async function get(client: SpokeApiClient, id: string): Promise<Device> {
  const entry = await directory.get(client, id);
  if (entry.type !== 'device' && entry.type !== 'trunkDevice') {
    const { NotFoundError } = await import('../errors');
    throw new NotFoundError(`"${id}" is a ${entry.type}, not a device`);
  }
  return entry as Device;
}
