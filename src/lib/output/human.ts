import { logger } from '../logger';

export interface Field<T> {
  label: string;
  get: (row: T) => unknown;
}

export function renderHuman<T>(row: T, fields: Field<T>[]): string {
  const maxLabel = fields.reduce((m, f) => Math.max(m, f.label.length), 0);
  const lines: string[] = [];
  for (const f of fields) {
    const padded = (f.label + ':').padEnd(maxLabel + 2);
    lines.push(`${padded}${stringify(f.get(row))}`);
  }
  return lines.join('\n');
}

export function printHuman<T>(row: T, fields: Field<T>[]): void {
  logger.info(renderHuman(row, fields));
}

function stringify(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(stringify).join(', ');
  return JSON.stringify(v);
}
