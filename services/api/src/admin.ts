import { FastifyInstance } from 'fastify';
import { listUsers, listSyncLogs, saveSyncLog, upsertUsers, createUser, updateUser, searchUsers } from './db';
import { z } from 'zod';
import { getCanaryPercent, setCanaryPercent } from './flags';

const SlackCreds = z.object({ clientId: z.string().min(1), clientSecret: z.string().min(1), signingSecret: z.string().min(1) });
const VapidCreds = z.object({ publicKey: z.string().min(1), privateKey: z.string().min(1) });

const memoryStore: { slack?: z.infer<typeof SlackCreds>; vapid?: z.infer<typeof VapidCreds> } = {};

function requireCsrf(headers: Record<string, any>) {
  const token = headers['x-csrf-token'] as string | undefined;
  const expected = process.env.NEXTAUTH_SECRET || '';
  return expected && token === expected;
}

function requireSession(headers: Record<string, any>) {
  // Optional guard. When ADMIN_AUTH_REQUIRED=1, require an email header to simulate session binding.
  if (process.env.ADMIN_AUTH_REQUIRED !== '1') return true;
  const user = headers['x-admin-user'] as string | undefined;
  return !!user;
}

export async function registerAdminRoutes(app: FastifyInstance) {
  app.post('/admin/credentials/slack', async (req, reply) => {
    if (!requireCsrf(req.headers) || !requireSession(req.headers)) return reply.code(403).send({ error: 'forbidden' });
    const parsed = SlackCreds.safeParse((req as any).body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    memoryStore.slack = parsed.data;
    return { ok: true };
  });

  app.get('/admin/credentials/slack', async () => ({ has: !!memoryStore.slack }));

  app.post('/admin/credentials/vapid', async (req, reply) => {
    if (!requireCsrf(req.headers) || !requireSession(req.headers)) return reply.code(403).send({ error: 'forbidden' });
    const parsed = VapidCreds.safeParse((req as any).body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    memoryStore.vapid = parsed.data;
    return { ok: true };
  });

  app.get('/admin/credentials/vapid', async () => ({ has: !!memoryStore.vapid }));

  // Directory status endpoints
  app.get('/admin/directory/users', async () => {
    const rows = await listUsers();
    return { users: rows };
  });
  app.get('/admin/directory/search', async (req) => {
    const q = (req as any).query?.q || '';
    const rows = await searchUsers(String(q));
    return { users: rows };
  });
  app.post('/admin/directory/sync', async (req, reply) => {
    if (!requireCsrf(req.headers) || !requireSession(req.headers)) return reply.code(403).send({ error: 'forbidden' });
    // Accept optional payload of users to upsert (for tests or admin-driven sync without Slack)
    const body = (req as any).body as any;
    if (body && Array.isArray(body.users)) {
      const upserted = await upsertUsers(body.users.map((u: any)=> ({ email: u.email, displayName: u.displayName || u.email, avatarUrl: u.avatarUrl || null, active: u.active !== false, source: 'slack' })));
      await saveSyncLog({ type: 'slackUsers', status: 'ok', details: { upserted } });
      return { upserted };
    }
    const log = await saveSyncLog({ type: 'slackUsers', status: 'ok', details: { ran: true } });
    return log;
  });
  app.get('/admin/directory/status', async () => {
    const logs = await listSyncLogs(5);
    return { logs };
  });

  // Admin-managed users (Slack optional)
  app.post('/admin/users', async (req, reply) => {
    if (!requireCsrf(req.headers) || !requireSession(req.headers)) return reply.code(403).send({ error: 'forbidden' });
    const body = (req as any).body as any;
    if (!body?.email || !body?.displayName) return reply.code(400).send({ error: 'invalid' });
    const u = await createUser({ email: body.email, displayName: body.displayName, avatarUrl: body.avatarUrl ?? null, active: body.active !== false, source: 'local' });
    return { user: u };
  });
  app.patch('/admin/users/:id', async (req, reply) => {
    if (!requireCsrf(req.headers) || !requireSession(req.headers)) return reply.code(403).send({ error: 'forbidden' });
    const id = (req.params as any).id as string;
    const body = (req as any).body as any;
    const u = await updateUser(id, { displayName: body.displayName, avatarUrl: body.avatarUrl, active: body.active });
    if (!u) return reply.code(404).send({ error: 'not_found' });
    return { user: u };
  });

  // Feature flag: canary percent
  app.get('/admin/flags/canary', async () => ({ canaryPercent: getCanaryPercent() }));
  app.post('/admin/flags/canary', async (req, reply) => {
    if (!requireCsrf(req.headers) || !requireSession(req.headers)) return reply.code(403).send({ error: 'forbidden' });
    const schema = z.object({ percent: z.number().int().min(0).max(100) });
    const parsed = schema.safeParse((req as any).body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const updated = setCanaryPercent(parsed.data.percent);
    return { ok: true, canaryPercent: updated.canaryPercent };
  });
}


