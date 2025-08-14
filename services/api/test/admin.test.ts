import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { registerAdminRoutes } from '../src/admin';

describe('admin creds', () => {
  it('requires csrf for saving', async () => {
    const app = Fastify(); await registerAdminRoutes(app);
    const res = await app.inject({ method: 'POST', url: '/admin/credentials/slack', payload: { clientId: 'a', clientSecret: 'b', signingSecret: 'c' } });
    expect(res.statusCode).toBe(403);
  });
  it('saves when csrf ok', async () => {
    process.env.NEXTAUTH_SECRET = 'token';
    const app = Fastify(); await registerAdminRoutes(app);
    const res = await app.inject({ method: 'POST', url: '/admin/credentials/slack', headers: { 'x-csrf-token': 'token' }, payload: { clientId: 'a', clientSecret: 'b', signingSecret: 'c' } });
    expect(res.statusCode).toBe(200);
  });
});


