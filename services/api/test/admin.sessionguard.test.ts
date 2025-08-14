import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { registerAdminRoutes } from '../src/admin';

describe('admin session guard (optional)', () => {
  it('requires x-admin-user when ADMIN_AUTH_REQUIRED=1', async () => {
    process.env.NEXTAUTH_SECRET = 'token';
    process.env.ADMIN_AUTH_REQUIRED = '1';
    const app = Fastify(); await registerAdminRoutes(app);
    const resForbidden = await app.inject({ method: 'POST', url: '/admin/credentials/slack', headers: { 'x-csrf-token': 'token' }, payload: { clientId: 'a', clientSecret: 'b', signingSecret: 'c' } });
    expect(resForbidden.statusCode).toBe(403);
    const resOk = await app.inject({ method: 'POST', url: '/admin/credentials/slack', headers: { 'x-csrf-token': 'token', 'x-admin-user': 'agent@example.com' }, payload: { clientId: 'a', clientSecret: 'b', signingSecret: 'c' } });
    expect(resOk.statusCode).toBe(200);
    delete process.env.ADMIN_AUTH_REQUIRED;
  });
});


