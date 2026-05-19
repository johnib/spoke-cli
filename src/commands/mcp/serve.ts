import { Command } from 'commander';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from '../../mcp/server';
import { logger } from '../../lib/logger';

export async function runServe(opts: { transport?: string; port?: number }): Promise<void> {
  const transport = opts.transport ?? 'stdio';
  if (transport === 'stdio') {
    const server = createServer();
    const stdioTransport = new StdioServerTransport();
    await server.connect(stdioTransport);
    // Keep alive — the transport keeps the process running while connected.
    return new Promise<void>(() => {
      /* never resolves */
    });
  }
  // HTTP transport — uses SSE
  logger.error(`http transport not yet implemented; use --transport stdio`);
  process.exit(1);
}

export function serveCommand(parent: Command): void {
  parent
    .command('serve')
    .description('Start the MCP server')
    .option('--transport <type>', 'Transport: stdio or http', 'stdio')
    .option('--port <n>', 'HTTP port (only when transport=http)', (v) => parseInt(v, 10))
    .action(async (opts) => runServe(opts));
}
