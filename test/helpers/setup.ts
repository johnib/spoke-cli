// Global Jest setup: applied before each test file. Prevents accidentally
// hitting any real network and clears env that could leak between tests.

process.env.SPOKE_CLIENT_ID = '';
process.env.SPOKE_CLIENT_SECRET = '';
process.env.SPOKE_HOME = '';
process.env.NO_COLOR = '1';

// Force a colour-disabled chalk for deterministic snapshots.
process.env.FORCE_COLOR = '0';
