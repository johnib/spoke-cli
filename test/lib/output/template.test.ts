import { renderTemplate } from '../../../src/lib/output/template';
import { ValidationError } from '../../../src/lib/errors';

describe('output/template', () => {
  it('renders a simple field expression', () => {
    expect(renderTemplate('Hi {{ .name }}', { name: 'A' })).toBe('Hi A');
  });

  it('renders nested fields', () => {
    expect(renderTemplate('{{ .a.b }}', { a: { b: 42 } })).toBe('42');
  });

  it('iterates with range', () => {
    const t = '{{range .}}{{.id}}-{{.name}} {{end}}';
    const out = renderTemplate(t, [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ]);
    expect(out).toBe('1-a 2-b ');
  });

  it('range over the spec example', () => {
    // spec: spoke directory list --template '{{range .}}{{.extension}} - {{.displayName}}{{"\n"}}{{end}}'
    const t = '{{range .}}{{.extension}} - {{.displayName}}{{"\\n"}}{{end}}';
    const out = renderTemplate(t, [
      { extension: '101', displayName: 'Alice' },
      { extension: '102', displayName: 'Bob' },
    ]);
    expect(out).toBe('101 - Alice\n102 - Bob\n');
  });

  it('handles {{.}} for the current item', () => {
    expect(renderTemplate('{{range .}}{{.}}\n{{end}}', ['a', 'b'])).toBe('a\nb\n');
  });

  it('emits empty for nil traversal', () => {
    expect(renderTemplate('{{ .a.b }}', { a: null })).toBe('');
  });

  it('throws ValidationError on unterminated tag', () => {
    expect(() => renderTemplate('{{ .x', {})).toThrow(ValidationError);
  });

  it('throws ValidationError on unsupported expression', () => {
    expect(() => renderTemplate('{{ foo() }}', {})).toThrow(ValidationError);
  });

  it('renders booleans and numbers as strings', () => {
    expect(renderTemplate('{{ .x }}', { x: true })).toBe('true');
    expect(renderTemplate('{{ .x }}', { x: 5 })).toBe('5');
  });

  it('renders objects as JSON', () => {
    expect(renderTemplate('{{ .x }}', { x: { a: 1 } })).toBe('{"a":1}');
  });

  it('non-array range body is skipped', () => {
    expect(renderTemplate('{{range .items}}X{{end}}done', { items: null })).toBe('done');
  });
});
