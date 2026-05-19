import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { SpokeApiClient } from '../lib/api/client';
import * as directory from '../lib/api/directory';
import * as users from '../lib/api/users';
import * as groups from '../lib/api/groups';
import * as calls from '../lib/api/calls';
import * as messages from '../lib/api/messages';
import * as webhooks from '../lib/api/webhooks';

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
  /** Executes the tool given parsed args; must return JSON-serializable data. */
  run: (args: Record<string, unknown>) => Promise<unknown>;
}

function newClient(): SpokeApiClient {
  return new SpokeApiClient();
}

export function buildTools(): ToolDef[] {
  return [
    {
      name: 'spoke_directory_list',
      description: 'List Spoke directory entries (users, groups, devices).',
      inputSchema: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['user', 'group', 'device'] },
          available: { type: 'boolean' },
          hidden: { type: 'boolean' },
          limit: { type: 'number' },
        },
      },
      run: async (args) => directory.list(newClient(), args as any),
    },
    {
      name: 'spoke_directory_get',
      description: 'Get a directory entry by extension or name.',
      inputSchema: {
        type: 'object',
        properties: { idOrName: { type: 'string' } },
        required: ['idOrName'],
      },
      run: async (args) => directory.get(newClient(), String(args.idOrName)),
    },
    {
      name: 'spoke_user_availability',
      description: 'Check real-time availability of a Spoke user.',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      run: async (args) => users.availability(newClient(), String(args.id)),
    },
    {
      name: 'spoke_group_availability',
      description: 'Show available/total member count for a call group.',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      run: async (args) => groups.availability(newClient(), String(args.id)),
    },
    {
      name: 'spoke_group_members',
      description: 'List members of a Spoke call group.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          available: { type: 'boolean' },
        },
        required: ['id'],
      },
      run: async (args) => groups.members(newClient(), String(args.id), { available: Boolean(args.available) }),
    },
    {
      name: 'spoke_call_transfer',
      description: 'Transfer an active call to a Spoke extension or +E164 number.',
      inputSchema: {
        type: 'object',
        properties: {
          sid: { type: 'string' },
          to: { type: 'string' },
          warm: { type: 'boolean' },
        },
        required: ['sid', 'to'],
      },
      run: async (args) => {
        const to = String(args.to);
        const isNumber = to.startsWith('+');
        return calls.redirect(newClient(), String(args.sid), {
          extension: isNumber ? undefined : to,
          number: isNumber ? to : undefined,
        });
      },
    },
    {
      name: 'spoke_call_twiml_url',
      description: 'Generate a TwiML redirect URL for a Spoke extension.',
      inputSchema: {
        type: 'object',
        properties: {
          extension: { type: 'string' },
          returnTo: { type: 'string' },
        },
        required: ['extension'],
      },
      run: async (args) => ({
        url: calls.twimlRedirectUrl({ extension: String(args.extension), returnTo: args.returnTo as string | undefined }),
      }),
    },
    {
      name: 'spoke_message_send',
      description: 'Send an SMS or WhatsApp message.',
      inputSchema: {
        type: 'object',
        properties: {
          to: { type: 'string' },
          from: { type: 'string' },
          body: { type: 'string' },
          channel: { type: 'string', enum: ['sms', 'whatsapp'] },
        },
        required: ['to', 'from', 'body'],
      },
      run: async (args) =>
        messages.send(newClient(), {
          to: String(args.to),
          from: String(args.from),
          body: String(args.body),
          channel: (args.channel as 'sms' | 'whatsapp') ?? 'sms',
        }),
    },
    {
      name: 'spoke_webhook_list',
      description: 'List configured Spoke webhooks.',
      inputSchema: { type: 'object', properties: {} },
      run: async () => webhooks.list(newClient()),
    },
    {
      name: 'spoke_api',
      description: 'Make an authenticated HTTP request to the Spoke API. The escape hatch for anything not modeled.',
      inputSchema: {
        type: 'object',
        properties: {
          method: { type: 'string' },
          path: { type: 'string' },
          body: { type: 'object' },
          query: { type: 'object' },
        },
        required: ['path'],
      },
      run: async (args) => {
        const c = newClient();
        const res = await c.request({
          method: (args.method as string) ?? 'GET',
          path: String(args.path),
          body: args.body,
          query: args.query as any,
        });
        return res.data;
      },
    },
  ];
}

export function createServer(tools: ToolDef[] = buildTools()): Server {
  const server = new Server(
    { name: 'spoke', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );
  const byName = new Map(tools.map((t) => [t.name, t]));
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = byName.get(req.params.name);
    if (!tool) {
      throw new Error(`unknown tool: ${req.params.name}`);
    }
    const data = await tool.run((req.params.arguments ?? {}) as Record<string, unknown>);
    return {
      content: [
        {
          type: 'text',
          text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
        },
      ],
    };
  });
  return server;
}
