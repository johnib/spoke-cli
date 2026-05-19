import { runWithExitCode } from '../../src/lib/exit';
import { SpokeError, AuthError } from '../../src/lib/errors';

describe('exit.runWithExitCode', () => {
  let stderr: jest.SpyInstance;

  beforeEach(() => {
    stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stderr.mockRestore();
  });

  it('returns 0 on success', async () => {
    const code = await runWithExitCode(async () => {
      // do nothing
    });
    expect(code).toBe(0);
  });

  it('maps SpokeError to its exit code', async () => {
    const code = await runWithExitCode(async () => {
      throw new AuthError();
    });
    expect(code).toBe(2);
  });

  it('prints hint when SpokeError has one', async () => {
    await runWithExitCode(async () => {
      throw new SpokeError('boom', 1, 'try fixing X');
    });
    const printed = stderr.mock.calls.map((c) => c[0]).join('');
    expect(printed).toContain('try fixing X');
  });

  it('returns 1 on generic Error', async () => {
    const code = await runWithExitCode(async () => {
      throw new Error('something broke');
    });
    expect(code).toBe(1);
  });

  it('returns 1 on non-Error throwables', async () => {
    const code = await runWithExitCode(async () => {
      throw 'string value';
    });
    expect(code).toBe(1);
  });
});
