import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { SpokeApiClient } from '../lib/api/client';
import * as directory from '../lib/api/directory';
import * as users from '../lib/api/users';
import * as groups from '../lib/api/groups';
import * as calls from '../lib/api/calls';
import * as voicemails from '../lib/api/voicemails';
import * as messages from '../lib/api/messages';
import * as webhooks from '../lib/api/webhooks';

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
  run: (args: Record<string, unknown>) => Promise<unknown>;
}

function newClient(): SpokeApiClient {
  return new SpokeApiClient();
}

export function buildTools(): ToolDef[] {
  return [
    {
      name: 'spoke_directory_list',
      description: 'List Spoke directory entries (users, teams, devices). Filters: type, available, hidden, limit.',
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
      description: 'Get a directory entry by UUID, extension, or display name.',
      inputSchema: {
        type: 'object',
        properties: { idOrName: { type: 'string' } },
        required: ['idOrName'],
      },
      run: async (args) => directory.get(newClient(), String(args.idOrName)),
    },
    {
      name: 'spoke_user_availability',
      description: 'Check the presence/availability of a Spoke user (extension, UUID, or email).',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      run: async (args) => users.availability(newClient(), String(args.id)),
    },
    {
      name: 'spoke_group_availability',
      description: 'Show available/total member count for a call group (team).',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      run: async (args) => groups.availability(newClient(), String(args.id)),
    },
    {
      name: 'spoke_group_members',
      description: 'List members of a Spoke team.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          available: { type: 'boolean' },
        },
        required: ['id'],
      },
      run: async (args) =>
        groups.members(newClient(), String(args.id), { available: Boolean(args.available) }),
    },
    {
      name: 'spoke_call_list',
      description: 'List recent calls. Filters: includeActive, since (unix ts), before, modified, contactNumber, limit, sortOrder.',
      inputSchema: {
        type: 'object',
        properties: {
          includeActive: { type: 'boolean' },
          since: { type: 'number' },
          before: { type: 'number' },
          modified: { type: 'number' },
          contactNumber: { type: 'string' },
          sortOrder: { type: 'string', enum: ['ascending', 'descending'] },
          limit: { type: 'number' },
        },
      },
      run: async (args) => calls.list(newClient(), args as any),
    },
    {
      name: 'spoke_call_get',
      description: 'Get a single call by Spoke call id.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          includeRecordingUrl: { type: 'boolean' },
        },
        required: ['id'],
      },
      run: async (args) =>
        calls.get(newClient(), String(args.id), { includeRecordingUrl: Boolean(args.includeRecordingUrl) }),
    },
    {
      name: 'spoke_voicemail_list',
      description: 'List voicemails (derived view over /calls — calls that landed in voicemail).',
      inputSchema: {
        type: 'object',
        properties: {
          since: { type: 'number' },
          before: { type: 'number' },
          limit: { type: 'number' },
        },
      },
      run: async (args) => voicemails.list(newClient(), args as any),
    },
    {
      name: 'spoke_message_send',
      description: 'Send an outbound SMS or WhatsApp message. (The API does not expose a read endpoint; subscribe to the conversation.message.created webhook to receive.)',
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
