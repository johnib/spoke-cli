import { Command } from 'commander';
import { serveCommand } from './serve';

export function registerMcpCommands(program: Command): void {
  const m = program.command('mcp').description('MCP bridge — expose Spoke commands as AI tools');
  serveCommand(m);
}
