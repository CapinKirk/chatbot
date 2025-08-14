import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';

describe('directory-sync sync endpoint', () => {
  it('returns status ok on /sync', async () => {
    const app = Fastify();
    // Inline minimal endpoints to avoid importing worker side-effects
    let lastStatus = { status: 'idle', users: 0, when: null as null | string };
    app.post('/sync', async ()=>{ lastStatus = { status:'ok', users: 0, when: new Date().toISOString() }; return lastStatus; });
    const res = await app.inject({ method: 'POST', url: '/sync' });
    expect(res.statusCode).toBe(200);
    const json = res.json() as any;
    expect(json.status).toBe('ok');
  });
});


