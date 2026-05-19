export interface LoggerState {
  silent: boolean;
  verbose: boolean;
}

const state: LoggerState = {
  silent: false,
  verbose: false,
};

export const logger = {
  setSilent(v: boolean): void {
    state.silent = v;
  },
  setVerbose(v: boolean): void {
    state.verbose = v;
  },
  isSilent(): boolean {
    return state.silent;
  },
  isVerbose(): boolean {
    return state.verbose;
  },
  info(...args: unknown[]): void {
    if (state.silent) return;
    process.stdout.write(args.map(String).join(' ') + '\n');
  },
  out(s: string): void {
    if (state.silent) return;
    process.stdout.write(s);
  },
  error(...args: unknown[]): void {
    process.stderr.write(args.map(String).join(' ') + '\n');
  },
  debug(...args: unknown[]): void {
    if (!state.verbose) return;
    process.stderr.write('[debug] ' + args.map(String).join(' ') + '\n');
  },
  /** Reset state — intended for tests. */
  reset(): void {
    state.silent = false;
    state.verbose = false;
  },
};
