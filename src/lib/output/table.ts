import Table from 'cli-table3';
import { logger } from '../logger';

export interface Column<T> {
  header: string;
  /** Function to extract the cell value from a row. */
  get: (row: T) => unknown;
}

export function renderTable<T>(rows: T[], columns: Column<T>[]): string {
  const table = new Table({
    head: columns.map((c) => c.header),
    style: { head: [], border: [] }, // no color
    chars: {
      top: '',
      'top-mid': '',
      'top-left': '',
      'top-right': '',
      bottom: '',
      'bottom-mid': '',
      'bottom-left': '',
      'bottom-right': '',
      left: '',
      'left-mid': '',
      mid: '',
      'mid-mid': '',
      right: '',
      'right-mid': '',
      middle: '  ',
    },
  });
  for (const row of rows) {
    table.push(columns.map((c) => stringify(c.get(row))));
  }
  return table.toString();
}

export function printTable<T>(rows: T[], columns: Column<T>[]): void {
  if (rows.length === 0) {
    logger.info('No items.');
    return;
  }
  logger.info(renderTable(rows, columns));
}

function stringify(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
}
