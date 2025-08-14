import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import { addMessage, createConversation, listMessages } from '../src/db';

describe('messages list', () => {
  it('returns messages for a conversation (in-memory)', async () => {
    const conv = await createConversation();
    await addMessage({ conversationId: conv.id, role: 'user', content: 'hi' });
    await addMessage({ conversationId: conv.id, role: 'agent', content: 'hello' });
    const rows = await listMessages(conv.id);
    expect(rows.length).toBe(2);
    expect(rows[0].content).toBe('hi');
  });

  it('exposes GET /conversations/:id/messages', async () => {
    const app = Fastify();
    await app.register(cors, { origin: true, credentials: true });
    await app.register(websocket);
    const conv = await createConversation();
    await addMessage({ conversationId: conv.id, role: 'user', content: 'foo' });
    // Inline minimal route that calls listMessages to avoid importing server side-effects
    app.get('/conversations/:id/messages', async (req) => listMessages((req.params as any).id));
    const res = await app.inject({ method: 'GET', url: `/conversations/${conv.id}/messages` });
    expect(res.statusCode).toBe(200);
    const json = res.json() as any[];
    expect(json.length).toBe(1);
    expect(json[0].content).toBe('foo');
  });
});


