import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { z } from 'zod';
import { ConversationSchema, MessageSchema, PushSubscriptionSchema } from '@chat/shared';
import { routeWithAI } from './routeWithAI.js';
import { rateLimitOk } from './rateLimit.js';
import { addMessage, addSubscription, createConversation, saveDecision, listMessages, listSubscriptions } from './db.js';
import { sendWebPush } from './notifications.js';
import { startNotificationProcessing, enqueueNotification } from './queue.js';
import { registerAdminRoutes } from './admin.js';

const app = Fastify({ logger: true });
await app.register(cors, { origin: true, credentials: true });
await app.register(websocket);
startNotificationProcessing();

app.get('/healthz', async () => ({ ok: true }));
await registerAdminRoutes(app);

// In-memory store stub (to be replaced by Prisma in full impl)
const conversations = new Map<string, any>();
const messages: Array<any> = [];
const subscriptions: Record<string, Array<{ endpoint: string; keys: any }>> = {};

// Create a conversation
app.post('/conversations', async (req, reply) => {
  const body = (req as any).body || {};
  const parsed = ConversationSchema.partial({ id: true }).safeParse(body);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
  const conv = await createConversation();
  return conv;
});

// List messages for a conversation (persisted or in-memory)
app.get('/conversations/:id/messages', async (req, reply) => {
  const id = (req.params as any).id as string;
  const rows = await listMessages(id);
  return rows;
});

// Send message and broadcast
const SendMessageSchema = MessageSchema.pick({ conversationId: true, role: true, content: true }).extend({ senderId: z.string().uuid().nullable().optional() });
app.post('/messages', async (req, reply) => {
  const ip = (req.headers['x-forwarded-for'] as string) || (req.socket as any).remoteAddress || 'ip';
  if (!rateLimitOk(ip, 20, 60_000)) return reply.code(429).send({ error: 'rate_limited' });
  const parsed = SendMessageSchema.safeParse((req as any).body);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
  const msg = await addMessage(parsed.data as any);
  io.to(`c:${msg.conversationId}`).emit('message', { role: msg.role, content: msg.content });
  // Canary percentage: only route via AI for a subset
  const canary = parseInt(process.env.CANARY_PERCENT || '5', 10);
  if (msg.role === 'user' && Math.random() * 100 < canary) {
    routeWithAI(msg, { aiUrl: process.env.AI_BOT_URL || 'http://localhost:4100/classify', timeoutMs: 2000 })
      .then(decision => {
        io.to(`c:${msg.conversationId}`).emit('route', { intent: decision.intent, confidence: decision.confidence, destination: decision.destination });
        saveDecision({ conversationId: msg.conversationId, modelVersion: decision.modelVersion, promptId: decision.promptId, intent: decision.intent, confidence: decision.confidence, destinationType: (decision.destination as any).type, destinationId: (decision.destination as any).id ?? null }).catch(()=>{});
        // Fire push notifications to all subscribers (demo: broadcast)
        listSubscriptions().then(subs => Promise.all(subs.map(s => sendWebPush({ endpoint: s.endpoint, keys: s.keys }, { title: 'New assignment', body: `Intent: ${decision.intent}` })))).catch(()=>{});
      })
      .catch(() => {
        io.to(`c:${msg.conversationId}`).emit('route', { intent: 'unknown', confidence: 0, destination: { type:'triage' } });
      });
  } else if (msg.role === 'user') {
    io.to(`c:${msg.conversationId}`).emit('route', { intent: 'unknown', confidence: 0, destination: { type:'triage' } });
  }
  // Minimal agent auto-ack to satisfy vertical slice real-time reply
  if (msg.role === 'user') {
    const ack = await addMessage({ conversationId: msg.conversationId, role: 'agent', content: 'Thanks! An agent will be with you shortly.' } as any);
    io.to(`c:${msg.conversationId}`).emit('message', { role: ack.role, content: ack.content });
  }
  return msg;
});

// Push subscription
app.post('/push/subscribe', async (req, reply) => {
  const parsed = PushSubscriptionSchema.safeParse((req as any).body);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
  const userId = (req.headers['x-user-id'] as string) || 'anonymous';
  await addSubscription(userId, parsed.data.endpoint, parsed.data.keys);
  return { ok: true };
});

// Enqueue a generic notification (used by admin or tests)
app.post('/notify', async (req) => {
  const body = (req as any).body || {};
  const title = String(body.title || 'Notification');
  const bodyText = String(body.body || '');
  await enqueueNotification({ title, body: bodyText, data: body.data || {} });
  return { ok: true };
});

const httpServer = createServer(app as any);
const io = new Server(httpServer, { path: '/ws', cors: { origin: '*' } });

io.on('connection', (socket) => {
  const conversationId = socket.id; // placeholder
  socket.emit('connected', { conversationId });
  socket.on('join', ({ conversationId: cid }) => {
    socket.join(`c:${cid}`);
  });
  socket.on('message', ({ conversationId: cid, content }) => {
    io.to(`c:${cid}`).emit('message', { role: 'user', content });
    // In a full build, enqueue routing and bot inference here
  });
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
httpServer.listen(port, () => {
  console.log(`api listening on ${port}`);
});


function cryptoRandomId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}


