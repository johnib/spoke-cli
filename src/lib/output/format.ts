import { logger } from '../logger';
import { applyJq } from './jq';
import { renderTemplate } from './template';
import { Column, renderTable } from './table';
import { Field, renderHuman } from './human';

export interface OutputOptions {
  json?: boolean;
  table?: boolean;
  jq?: string;
  template?: string;
  silent?: boolean;
}

export interface FormatListOpts<T> extends OutputOptions {
  /** Display columns for the default table view. */
  columns: Column<T>[];
}

export interface FormatItemOpts<T> extends OutputOptions {
  /** Field list for the human key:value view. */
  fields: Field<T>[];
}

/**
 * Render a list payload according to global format flags. Default is table.
 * Precedence:  --jq > --template > --json > --table (default).
 */
export async function formatList<T>(items: T[], opts: FormatListOpts<T>): Promise<void> {
  if (opts.silent) return;
  if (opts.jq) {
    logger.info(await applyJq(opts.jq, items));
    return;
  }
  if (opts.template) {
    logger.out(renderTemplate(opts.template, items));
    return;
  }
  if (opts.json) {
    logger.info(JSON.stringify(items, null, 2));
    return;
  }
  if (items.length === 0) {
    logger.info('No items.');
    return;
  }
  logger.info(renderTable(items, opts.columns));
}

/**
 * Render a single-item payload. Default is human key:value.
 */
export async function formatItem<T>(item: T, opts: FormatItemOpts<T>): Promise<void> {
  if (opts.silent) return;
  if (opts.jq) {
    logger.info(await applyJq(opts.jq, item));
    return;
  }
  if (opts.template) {
    logger.out(renderTemplate(opts.template, item));
    return;
  }
  if (opts.json) {
    logger.info(JSON.stringify(item, null, 2));
    return;
  }
  logger.info(renderHuman(item, opts.fields));
}

/**
 * Raw JSON dump — used by `spoke api` and similar. Respects --jq / --template.
 */
export async function formatRaw(payload: unknown, opts: OutputOptions = {}): Promise<void> {
  if (opts.silent) return;
  if (opts.jq) {
    logger.info(await applyJq(opts.jq, payload));
    return;
  }
  if (opts.template) {
    logger.out(renderTemplate(opts.template, payload));
    return;
  }
  if (typeof payload === 'string') {
    logger.info(payload);
    return;
  }
  logger.info(JSON.stringify(payload, null, 2));
}
