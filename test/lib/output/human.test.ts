import { renderHuman, printHuman } from '../../../src/lib/output/human';
import { logger } from '../../../src/lib/logger';

describe('output/human', () => {
  it('renders aligned key:value pairs', () => {
    const text = renderHuman(
      { id: 101, name: 'Alice', devices: ['iPhone', 'MacBook'] },
      [
        { label: 'Extension', get: (x) => x.id },
        { label: 'Name', get: (x) => x.name },
        { label: 'Devices', get: (x) => x.devices },
      ],
    );
    expect(text).toContain('Extension: 101');
    expect(text).toContain('Name:      Alice');
    expect(text).toContain('Devices:   iPhone, MacBook');
  });

  it('renders booleans and numbers', () => {
    const text = renderHuman({ a: true, b: 5 }, [
      { label: 'A', get: (x) => x.a },
      { label: 'B', get: (x) => x.b },
    ]);
    expect(text).toContain('true');
    expect(text).toContain('5');
  });

  it('treats null/undefined as empty', () => {
    const text = renderHuman({ a: null, b: undefined }, [
      { label: 'A', get: (x) => x.a },
      { label: 'B', get: (x) => x.b },
    ]);
    expect(text.split('\n')[0]).toMatch(/^A: +$/);
  });

  it('stringifies objects as JSON', () => {
    const text = renderHuman({ a: { x: 1 } }, [{ label: 'A', get: (x) => x.a }]);
    expect(text).toContain('{"x":1}');
  });

  it('printHuman writes to stdout', () => {
    const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    logger.reset();
    printHuman({ a: 1 }, [{ label: 'A', get: (x) => x.a }]);
    const out = stdout.mock.calls.map((c) => c[0]).join('');
    expect(out).toContain('A: 1');
    stdout.mockRestore();
  });
});
