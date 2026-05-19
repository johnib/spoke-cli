import { logger } from '../../src/lib/logger';

describe('logger', () => {
  let stdout: jest.SpyInstance;
  let stderr: jest.SpyInstance;

  beforeEach(() => {
    logger.reset();
    stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdout.mockRestore();
    stderr.mockRestore();
    logger.reset();
  });

  it('info writes to stdout by default', () => {
    logger.info('hello');
    expect(stdout).toHaveBeenCalledWith('hello\n');
  });

  it('silent suppresses info but not error', () => {
    logger.setSilent(true);
    logger.info('quiet');
    logger.error('loud');
    expect(stdout).not.toHaveBeenCalled();
    expect(stderr).toHaveBeenCalledWith('loud\n');
  });

  it('debug requires verbose', () => {
    logger.debug('nope');
    expect(stderr).not.toHaveBeenCalled();
    logger.setVerbose(true);
    logger.debug('yes');
    expect(stderr).toHaveBeenCalledWith('[debug] yes\n');
  });

  it('out writes without newline', () => {
    logger.out('partial');
    expect(stdout).toHaveBeenCalledWith('partial');
  });

  it('exposes silent/verbose state', () => {
    logger.setSilent(true);
    logger.setVerbose(true);
    expect(logger.isSilent()).toBe(true);
    expect(logger.isVerbose()).toBe(true);
  });
});
