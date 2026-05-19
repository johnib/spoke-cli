import { applyJq } from '../../../src/lib/output/jq';
import { ValidationError } from '../../../src/lib/errors';

describe('output/jq', () => {
  it('selects a field across an array', async () => {
    const out = await applyJq('$.name', [{ name: 'a' }, { name: 'b' }]);
    expect(out).toBe('a\nb');
  });

  it('returns a single value when filter matches one item', async () => {
    const out = await applyJq('name', { name: 'alice' });
    expect(out).toBe('alice');
  });

  it('renders objects as JSON', async () => {
    const out = await applyJq('$', { a: 1 });
    expect(out).toBe('{"a":1}');
  });

  it('throws ValidationError on invalid expression', async () => {
    await expect(applyJq('invalid(((', {})).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError on runtime error', async () => {
    // Reference to a non-function call site that JSONata can compile but fails at runtime.
    await expect(applyJq('$nonexistent()', {})).rejects.toBeInstanceOf(ValidationError);
  });
});
