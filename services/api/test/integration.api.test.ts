import { describe, it, expect } from 'vitest';
import http from 'node:http';

function startAiServer() {
  return new Promise<{ url: string; close: () => Promise<void> }>((resolve) => {
    const srv = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/classify') {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ intent: 'support', confidence: 0.95, destination: { type: 'queue', id: 'support' }, modelVersion: 'rule', promptId: 'base' }));
      } else {
        res.statusCode = 404; res.end();
      }
    });
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolve({ url: `http://127.0.0.1:${port}/classify`, close: () => new Promise(r => srv.close(()=>r())) });
    });
  });
}

describe('API integration', () => {
  const base = process.env.API_TEST_SERVER;
  const run = base ? it : it.skip;
  run('creates conversation and accepts message', async () => {
    const ai = await startAiServer();
    process.env.AI_BOT_URL = ai.url;
    const convRes = await fetch(base + '/conversations', { method: 'POST', headers: { 'content-type':'application/json' }, body: '{}' });
    expect(convRes.ok).toBe(true);
    const conv = await convRes.json() as any;
    const msgRes = await fetch(base + '/messages', { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify({ conversationId: conv.id, role: 'user', content: 'help' }) });
    expect(msgRes.ok).toBe(true);
    await ai.close();
  });
});


