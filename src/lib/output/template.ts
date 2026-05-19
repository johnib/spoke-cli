import { ValidationError } from '../errors';

/**
 * A minimal Go `text/template`-style renderer. Supports:
 *   {{ .field }}                    — access a top-level field
 *   {{ .a.b }}                       — nested field
 *   {{ range . }} ... {{ end }}     — iterate over an array
 *   {{ "\n" }}                       — literal string (used in spec)
 *   {{ . }}                         — current value (inside range, the item)
 *
 * Enough for the use-cases shown in the spec. Tests pin the supported subset.
 */
export function renderTemplate(template: string, data: unknown): string {
  return new TemplateRenderer(template).render(data);
}

class TemplateRenderer {
  constructor(private readonly template: string) {}

  render(data: unknown): string {
    return this.parseAndRender(this.template, data, 0).text;
  }

  private parseAndRender(src: string, ctx: unknown, pos: number, endTag?: string): { text: string; pos: number } {
    let out = '';
    let i = pos;
    while (i < src.length) {
      const open = src.indexOf('{{', i);
      if (open === -1) {
        if (endTag) throw new ValidationError(`unterminated {{${endTag}}} in template`);
        out += src.slice(i);
        return { text: out, pos: src.length };
      }
      out += src.slice(i, open);
      const close = src.indexOf('}}', open + 2);
      if (close === -1) throw new ValidationError('unterminated `{{` in template');
      const action = src.slice(open + 2, close).trim();

      if (endTag && action === endTag) {
        return { text: out, pos: close + 2 };
      }

      if (action.startsWith('range ')) {
        const rangeExpr = action.slice('range '.length).trim();
        const collection = evalExpr(rangeExpr, ctx);
        const bodyStart = close + 2;
        // Find matching {{end}}. Render once to discover where end is.
        // We do this by parsing the body recursively with endTag='end' and a discardable ctx.
        const bodySrc = src;
        if (!Array.isArray(collection)) {
          // Non-array: skip body entirely
          const skipped = this.parseAndRender(bodySrc, undefined, bodyStart, 'end');
          i = skipped.pos;
          continue;
        }
        let assembled = '';
        let endPos = bodyStart;
        for (const item of collection) {
          const rendered = this.parseAndRender(bodySrc, item, bodyStart, 'end');
          assembled += rendered.text;
          endPos = rendered.pos;
        }
        out += assembled;
        i = endPos;
        continue;
      }

      out += stringify(evalExpr(action, ctx));
      i = close + 2;
    }
    if (endTag) throw new ValidationError(`unterminated {{${endTag}}} in template`);
    return { text: out, pos: i };
  }
}

function evalExpr(expr: string, ctx: unknown): unknown {
  if (expr === '.') return ctx;
  // String literal
  if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
    return JSON.parse('"' + expr.slice(1, -1).replace(/\\"/g, '\\"') + '"');
  }
  if (!expr.startsWith('.')) {
    throw new ValidationError(`unsupported template expression: ${expr}`);
  }
  // Field path: .a.b.c
  const parts = expr.slice(1).split('.').filter(Boolean);
  let cur: any = ctx;
  for (const p of parts) {
    if (cur === undefined || cur === null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function stringify(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
}
