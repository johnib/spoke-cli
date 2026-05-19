import { renderTable, printTable } from '../../../src/lib/output/table';
import { logger } from '../../../src/lib/logger';

describe('output/table', () => {
  let stdout: jest.SpyInstance;
  beforeEach(() => {
    logger.reset();
    stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });
  afterEach(() => {
    stdout.mockRestore();
    logger.reset();
  });

  it('renders a header row and value rows', () => {
    const rendered = renderTable(
      [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
      [
        { header: 'ID', get: (r) => r.id },
        { header: 'NAME', get: (r) => r.name },
      ],
    );
    expect(rendered).toContain('ID');
    expect(rendered).toContain('NAME');
    expect(rendered).toContain('Alice');
    expect(rendered).toContain('Bob');
  });

  it('stringifies undefined/null as empty', () => {
    const r = renderTable([{ a: null, b: undefined }], [
      { header: 'A', get: (x) => x.a },
      { header: 'B', get: (x) => x.b },
    ]);
    expect(r).toContain('A');
    expect(r).toContain('B');
  });

  it('stringifies objects as JSON', () => {
    const r = renderTable([{ nested: { k: 1 } }], [
      { header: 'N', get: (x) => x.nested },
    ]);
    expect(r).toContain('{"k":1}');
  });

  it('printTable writes empty message for no items', () => {
    printTable([], [{ header: 'X', get: () => '' }]);
    expect(stdout).toHaveBeenCalledWith('No items.\n');
  });

  it('printTable writes the rendered table to stdout', () => {
    printTable([{ a: 1 }], [{ header: 'A', get: (x) => x.a }]);
    const out = stdout.mock.calls.map((c) => c[0]).join('');
    expect(out).toContain('A');
    expect(out).toContain('1');
  });
});
