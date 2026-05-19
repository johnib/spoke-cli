import * as fs from 'node:fs';
import { setupTmpHome, TmpHome } from '../../helpers/tmp-home';
import { readToken, writeToken, clearToken, isExpired } from '../../../src/lib/auth/token-cache';

describe('auth/token-cache', () => {
  let tmp: TmpHome;
  beforeEach(() => {
    tmp = setupTmpHome();
  });
  afterEach(() => tmp.cleanup());

  it('returns null when no token cached', () => {
    expect(readToken('default')).toBeNull();
  });

  it('round-trips a token through disk', () => {
    const token = { access_token: 'abc', token_type: 'Bearer', expires_at: Date.now() + 60000 };
    writeToken('default', token);
    expect(readToken('default')).toEqual(token);
  });

  it('writes token file with 0600 perms', () => {
    writeToken('default', { access_token: 'a', token_type: 'Bearer', expires_at: Date.now() });
    const mode = fs.statSync(`${tmp.home}/tokens/default.json`).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it('clears a token', () => {
    writeToken('default', { access_token: 'a', token_type: 'Bearer', expires_at: Date.now() });
    clearToken('default');
    expect(readToken('default')).toBeNull();
  });

  it('returns null for corrupted token files', () => {
    writeToken('default', { access_token: 'a', token_type: 'Bearer', expires_at: Date.now() });
    fs.writeFileSync(`${tmp.home}/tokens/default.json`, 'not json');
    expect(readToken('default')).toBeNull();
  });

  it('isExpired returns true when expiry is within the safety window', () => {
    const t = { access_token: 'a', token_type: 'Bearer', expires_at: Date.now() + 1000 };
    expect(isExpired(t)).toBe(true);
  });

  it('isExpired returns false when expiry is far in the future', () => {
    const t = { access_token: 'a', token_type: 'Bearer', expires_at: Date.now() + 600_000 };
    expect(isExpired(t)).toBe(false);
  });

  it('clearToken is a no-op when file missing', () => {
    expect(() => clearToken('absent')).not.toThrow();
  });
});
