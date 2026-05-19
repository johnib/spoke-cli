import jsonata from 'jsonata';
import { ValidationError } from '../errors';

/**
 * Apply a JSONata expression (compatible enough with simple jq usage for our
 * `--jq` flag) to a JS value. Returns the result as a string for stdout.
 *
 * If the expression result is an array, each element is rendered on its own
 * line — matches jq's default streaming behaviour for simple selectors.
 */
export async function applyJq(expr: string, value: unknown): Promise<string> {
  let compiled;
  try {
    compiled = jsonata(expr);
  } catch (err: any) {
    throw new ValidationError(`invalid --jq expression: ${err.message}`);
  }
  let result;
  try {
    result = await compiled.evaluate(value);
  } catch (err: any) {
    throw new ValidationError(`--jq evaluation failed: ${err.message}`);
  }
  return stringifyResult(result);
}

function stringifyResult(v: unknown): string {
  if (v === undefined) return '';
  if (Array.isArray(v)) return v.map(renderScalar).join('\n');
  return renderScalar(v);
}

function renderScalar(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
}
