import { SpokeApiClient } from './client';

/**
 * Outbound messages are the only message operation on the public API.
 * The list/get endpoints from earlier drafts of this CLI do not exist —
 * to consume messages, subscribe to the `conversation.message.created`
 * webhook event.
 */
export interface Message {
  id?: string;
  status?: string;
  to?: string;
  from?: string;
  body?: string;
  channel?: 'sms' | 'whatsapp' | string;
}

export interface SendOpts {
  to: string;
  from: string;
  body: string;
  channel?: 'sms' | 'whatsapp';
}

export async function send(client: SpokeApiClient, opts: SendOpts): Promise<Message> {
  const res = await client.post<Message>('/conversationMessages', {
    to: opts.to,
    from: opts.from,
    body: opts.body,
    channel: opts.channel ?? 'sms',
  });
  return res.data;
}
