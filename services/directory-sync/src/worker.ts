import Fastify from 'fastify';
import crypto from 'node:crypto';

// Minimal status API to expose last sync run
const app = Fastify({ logger: true });
type DirUser = { email: string; displayName: string; avatarUrl?: string|null; active: boolean };
let lastStatus = { status: 'idle', users: 0, when: null as null | string };
let cachedUsers: DirUser[] = [];
let lastOAuth: { state: string|null } = { state: null };

app.get('/healthz', async ()=> ({ ok: true }));
app.post('/sync', async ()=>{
  // Placeholder: simulate read-only Slack directory fetch
  cachedUsers = [
    { email: 'agent1@example.com', displayName: 'Agent One', avatarUrl: null, active: true },
    { email: 'agent2@example.com', displayName: 'Agent Two', avatarUrl: null, active: true },
    { email: 'inactive@example.com', displayName: 'Inactive User', avatarUrl: null, active: false },
  ];
  lastStatus = { status:'ok', users: cachedUsers.length, when: new Date().toISOString() };
  return { ...lastStatus, users: cachedUsers };
});
app.get('/status', async ()=> lastStatus);
app.get('/users', async ()=> ({ users: cachedUsers }));

// Slack OAuth (read-only)
app.get('/oauth/start', async (req, reply) => {
  const clientId = process.env.SLACK_CLIENT_ID || 'client';
  const redirectUri = process.env.SLACK_REDIRECT_URI || 'http://localhost:4200/oauth/callback';
  const scopes = ['users:read','users:read.email'];
  const state = crypto.randomBytes(8).toString('hex');
  lastOAuth.state = state;
  const url = new URL('https://slack.com/openid/connect/authorize');
  // Using Slack OAuth v2 endpoint pattern with minimal scopes
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('scope', scopes.join(','));
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  return { url: url.toString() };
});

app.get('/oauth/callback', async (req, reply) => {
  const q = (req as any).query || {};
  const state = q.state as string|undefined;
  if (!state || state !== lastOAuth.state) {
    reply.code(400); return { error: 'invalid_state' };
  }
  // Do not exchange code here; scaffold only and never request channel scopes
  return { ok: true };
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4200;
app.listen({ port, host: '0.0.0.0' }).then(()=> app.log.info(`directory-sync listening on ${port}`));


