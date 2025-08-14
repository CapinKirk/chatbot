import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { registerAdminRoutes } from '../src/admin';

describe('admin directory', () => {
  it('lists users and logs, CSRF required for sync', async () => {
    const app = Fastify(); await registerAdminRoutes(app);
    const users = await app.inject({ method: 'GET', url: '/admin/directory/users' });
    expect(users.statusCode).toBe(200);
    const parsedUsers = JSON.parse(users.payload);
    expect(Array.isArray(parsedUsers.users)).toBe(true);

    const syncForbidden = await app.inject({ method: 'POST', url: '/admin/directory/sync' });
    expect(syncForbidden.statusCode).toBe(403);

    process.env.NEXTAUTH_SECRET = 'token';
    const syncOk = await app.inject({ method: 'POST', url: '/admin/directory/sync', headers: { 'x-csrf-token': 'token' } });
    expect(syncOk.statusCode).toBe(200);

    const status = await app.inject({ method: 'GET', url: '/admin/directory/status' });
    expect(status.statusCode).toBe(200);
    const parsed = JSON.parse(status.payload);
    expect(Array.isArray(parsed.logs)).toBe(true);
    expect(parsed.logs.length).toBeGreaterThan(0);
  });

  it('upserts users via admin directory sync payload', async () => {
    process.env.NEXTAUTH_SECRET = 'token';
    const app = Fastify(); await registerAdminRoutes(app);
    const payload = { users: [ { email: 'a@example.com', displayName: 'A User' }, { email: 'b@example.com', displayName: 'B User', active: false } ] };
    const res = await app.inject({ method: 'POST', url: '/admin/directory/sync', headers: { 'x-csrf-token': 'token' }, payload });
    expect(res.statusCode).toBe(200);
    const users = await app.inject({ method: 'GET', url: '/admin/directory/users' });
    const parsed = JSON.parse(users.payload);
    expect(parsed.users.find((u: any)=> u.email==='a@example.com')).toBeTruthy();
    expect(parsed.users.find((u: any)=> u.email==='b@example.com')?.active).toBe(false);
  });
});


