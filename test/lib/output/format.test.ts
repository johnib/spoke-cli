import { formatList, formatItem, formatRaw } from '../../../src/lib/output/format';
import { logger } from '../../../src/lib/logger';

describe('output/format', () => {
  let stdout: jest.SpyInstance;
  beforeEach(() => {
    logger.reset();
    stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });
  afterEach(() => {
    stdout.mockRestore();
    logger.reset();
  });

  function out(): string {
    return stdout.mock.calls.map((c) => c[0]).join('');
  }

  describe('formatList', () => {
    const items = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ];
    const columns = [
      { header: 'ID', get: (r: any) => r.id },
      { header: 'NAME', get: (r: any) => r.name },
    ];

    it('default is table', async () => {
      await formatList(items, { columns });
      expect(out()).toContain('ID');
      expect(out()).toContain('a');
    });

    it('--json emits JSON', async () => {
      await formatList(items, { columns, json: true });
      expect(out()).toContain('"name": "a"');
    });

    it('--jq runs JSONata', async () => {
      await formatList(items, { columns, jq: '$.name' });
      expect(out().trim()).toBe('a\nb');
    });

    it('--template renders go-style', async () => {
      await formatList(items, { columns, template: '{{range .}}{{.id}}\n{{end}}' });
      expect(out()).toBe('1\n2\n');
    });

    it('--silent emits nothing', async () => {
      await formatList(items, { columns, silent: true });
      expect(out()).toBe('');
    });

    it('empty list shows "No items."', async () => {
      await formatList([], { columns });
      expect(out()).toContain('No items.');
    });
  });

  describe('formatItem', () => {
    const fields = [
      { label: 'Name', get: (r: any) => r.name },
    ];

    it('default is human key:value', async () => {
      await formatItem({ name: 'alice' }, { fields });
      expect(out()).toContain('Name: alice');
    });

    it('--json emits JSON', async () => {
      await formatItem({ name: 'alice' }, { fields, json: true });
      expect(out()).toContain('"name": "alice"');
    });

    it('--jq runs over the item', async () => {
      await formatItem({ name: 'alice' }, { fields, jq: 'name' });
      expect(out().trim()).toBe('alice');
    });

    it('--template renders', async () => {
      await formatItem({ name: 'alice' }, { fields, template: '{{.name}}!' });
      expect(out()).toBe('alice!');
    });

    it('--silent emits nothing', async () => {
      await formatItem({ name: 'alice' }, { fields, silent: true });
      expect(out()).toBe('');
    });
  });

  describe('formatRaw', () => {
    it('emits string payload directly', async () => {
      await formatRaw('hello');
      expect(out()).toBe('hello\n');
    });

    it('emits JSON for objects', async () => {
      await formatRaw({ a: 1 });
      expect(out()).toContain('"a": 1');
    });

    it('--jq filters raw payload', async () => {
      await formatRaw({ a: 1 }, { jq: 'a' });
      expect(out().trim()).toBe('1');
    });

    it('--template formats raw payload', async () => {
      await formatRaw({ a: 1 }, { template: '{{.a}}' });
      expect(out()).toBe('1');
    });

    it('--silent emits nothing', async () => {
      await formatRaw({}, { silent: true });
      expect(out()).toBe('');
    });
  });
});
