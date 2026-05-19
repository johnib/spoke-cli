import { Command } from 'commander';
import * as fs from 'node:fs';
import { formatRaw } from '../lib/output/format';
import { globalOpts, makeClient } from './_shared';
import { ValidationError } from '../lib/errors';

/**
 * Generic page extractor for the Spoke envelope shape `{ meta: { next }, <resource>: [...] }`
 * — works across /calls, /users, /webhooks, /trunks, /directory, etc. without knowing
 * the resource name. Falls back to bare arrays or top-level `entries`/`items` if present.
 */
export function extractPage(page: any): { items: any[]; next?: string | null } {
  if (Array.isArray(page)) return { items: page, next: null };
  const next = page?.meta?.next ?? page?.next ?? null;
  // Prefer the well-known keys.
  for (const k of ['entries', 'items', 'calls', 'users', 'webhooks', 'trunks', 'phonebooks', 'contacts', 'transcripts']) {
    if (Array.isArray(page?.[k])) return { items: page[k], next };
  }
  // Last resort: pick the first array-valued top-level key.
  for (const [k, v] of Object.entries(page ?? {})) {
    if (k === 'meta') continue;
    if (Array.isArray(v)) return { items: v as any[], next };
  }
  return { items: [], next };
}

function parseField(input: string): [string, unknown] {
  const idx = input.indexOf('=');
  if (idx === -1) throw new ValidationError(`--field expects key=value, got "${input}"`);
  const key = input.slice(0, idx);
  const raw = input.slice(idx + 1);
  // Auto-coerce true/false/numbers if obvious.
  if (raw === 'true') return [key, true];
  if (raw === 'false') return [key, false];
  if (/^-?\d+$/.test(raw)) return [key, parseInt(raw, 10)];
  if (/^-?\d+\.\d+$/.test(raw)) return [key, parseFloat(raw)];
  return [key, raw];
}

function setField(body: Record<string, any>, key: string, value: unknown): void {
  // Support `events[]=x` style for arrays.
  const m = key.match(/^(.+)\[\]$/);
  if (m) {
    const k = m[1];
    if (!Array.isArray(body[k])) body[k] = [];
    body[k].push(value);
    return;
  }
  body[key] = value;
}

function parseHeader(input: string): [string, string] {
  const idx = input.indexOf(':');
  if (idx === -1) throw new ValidationError(`--header expects "Key: Value", got "${input}"`);
  return [input.slice(0, idx).trim(), input.slice(idx + 1).trim()];
}

export interface ApiCommandOptions {
  method?: string;
  field?: string[];
  header?: string[];
  input?: string;
  paginate?: boolean;
  include?: boolean;
}

export async function runApi(cmd: Command, path: string, opts: ApiCommandOptions): Promise<void> {
  const method = (opts.method ?? 'GET').toUpperCase();
  const body: Record<string, any> = {};
  for (const f of opts.field ?? []) {
    const [k, v] = parseField(f);
    setField(body, k, v);
  }
  const headers: Record<string, string> = {};
  for (const h of opts.header ?? []) {
    const [k, v] = parseHeader(h);
    headers[k] = v;
  }

  let resolvedBody: unknown = Object.keys(body).length > 0 ? body : undefined;
  if (opts.input) {
    const text = opts.input === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(opts.input, 'utf8');
    try {
      resolvedBody = JSON.parse(text);
    } catch {
      resolvedBody = text;
    }
  }

  // Strip query string from path before pagination/transport (axios takes params separately).
  let urlPath = path;
  let queryParams: Record<string, string | number | boolean> | undefined;
  const qIdx = path.indexOf('?');
  if (qIdx !== -1) {
    urlPath = path.slice(0, qIdx);
    queryParams = {};
    for (const [k, v] of new URLSearchParams(path.slice(qIdx + 1))) {
      queryParams[k] = v;
    }
  }

  const client = makeClient(cmd);

  if (opts.paginate) {
    const all: any[] = [];
    for await (const batch of client.paginate(urlPath, extractPage, queryParams)) {
      all.push(...batch);
    }
    await formatRaw(all, globalOpts(cmd));
    return;
  }

  const res = await client.request({
    method,
    path: urlPath,
    query: queryParams,
    body: resolvedBody,
    headers,
  });

  if (opts.include) {
    const headerLines = Object.entries(res.headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    await formatRaw(`HTTP ${res.status}\n${headerLines}\n\n${JSON.stringify(res.data, null, 2)}`, globalOpts(cmd));
    return;
  }
  await formatRaw(res.data, globalOpts(cmd));
}

export function registerApiCommand(program: Command): void {
  const cmd = program
    .command('api <path>')
    .description('Make an authenticated HTTP request to the Spoke API')
    .option('--method <METHOD>', 'HTTP method', 'GET')
    .option('--field <key=value>', 'JSON body field (repeatable)', (v: string, acc: string[] = []) => acc.concat([v]), [])
    .option('--header <key:value>', 'Request header (repeatable)', (v: string, acc: string[] = []) => acc.concat([v]), [])
    .option('--input <file>', 'Read request body from file (- for stdin)')
    .option('--paginate', 'Follow pagination cursors', false)
    .option('--include', 'Include response headers in output', false);

  cmd.action(async function (this: Command, path: string, opts: any) {
    await runApi(this, path, opts);
  });
}
