import { SpokeApiClient } from './client';

export interface Device {
  id: string;
  userId?: string;
  userName?: string;
  type?: string;
  platform?: string;
  status?: string;
  active?: boolean;
}

export interface ListOpts {
  user?: string;
  type?: string;
  active?: boolean;
  next?: string;
  limit?: number;
}

interface RawTrunkDevice extends Device {
  trunkId?: string;
}

async function listAllTrunkDevices(client: SpokeApiClient): Promise<RawTrunkDevice[]> {
  // Spoke devices live under trunks. We enumerate the trunks first, then
  // collect each trunk's devices.
  const trunks = await client.get<{ entries?: Array<{ id: string }> } | Array<{ id: string }>>(
    '/trunks',
  );
  const trunkList = Array.isArray(trunks.data)
    ? trunks.data
    : (trunks.data as any).entries ?? [];
  const all: RawTrunkDevice[] = [];
  for (const t of trunkList) {
    const res = await client.get<{ entries?: RawTrunkDevice[] } | RawTrunkDevice[]>(
      `/trunks/${encodeURIComponent(t.id)}/trunkDevices`,
    );
    const arr = Array.isArray(res.data) ? res.data : (res.data as any).entries ?? [];
    for (const d of arr) {
      all.push({ ...d, trunkId: t.id });
    }
  }
  return all;
}

export async function list(client: SpokeApiClient, opts: ListOpts = {}): Promise<Device[]> {
  const all = await listAllTrunkDevices(client);
  return all.filter((d) => {
    if (opts.user && String(d.userId) !== opts.user && d.userName !== opts.user) return false;
    if (opts.type && d.type !== opts.type) return false;
    if (opts.active && !d.active && d.status !== 'active') return false;
    return true;
  });
}

export async function get(client: SpokeApiClient, id: string): Promise<Device> {
  const all = await listAllTrunkDevices(client);
  const found = all.find((d) => d.id === id);
  if (!found) {
    throw Object.assign(new Error(`device ${id} not found`), { status: 404 });
  }
  return found;
}
