import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { registerAdminRoutes } from '../src/admin';

describe('admin-managed users', () => {
  it('creates and updates a user with csrf + optional session', async () => {
    process.env.NEXTAUTH_SECRET = 'token';
    const app = Fastify(); await registerAdminRoutes(app);
    const create = await app.inject({ method: 'POST', url: '/admin/users', headers: { 'x-csrf-token': 'token', 'x-admin-user': 'admin@example.com' }, payload: { email: 'local@example.com', displayName: 'Local User' } });
    expect(create.statusCode).toBe(200);
    const u = (create.json() as any).user;
    expect(u.email).toBe('local@example.com');
    const upd = await app.inject({ method: 'PATCH', url: `/admin/users/${u.id}`, headers: { 'x-csrf-token': 'token', 'x-admin-user': 'admin@example.com' }, payload: { active: false } });
    expect(upd.statusCode).toBe(200);
    const u2 = (upd.json() as any).user;
    expect(u2.active).toBe(false);
  });

  it('searches users by query', async () => {
    const app = Fastify(); await registerAdminRoutes(app);
    const res = await app.inject({ method: 'GET', url: '/admin/directory/search?q=local' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as any;
    expect(Array.isArray(body.users)).toBe(true);
  });
});


