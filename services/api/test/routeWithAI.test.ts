import { describe, it, expect } from 'vitest';
import http from 'node:http';
import routeWithAI from '../src/routeWithAI';

function startServer(handler: (req: http.IncomingMessage, res: http.ServerResponse) => void) {
  return new Promise<{ url: string; close: () => Promise<void> }>((resolve) => {
    const srv = http.createServer(handler);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolve({ url: `http://127.0.0.1:${port}/classify`, close: () => new Promise(r => srv.close(()=>r())) });
    });
  });
}

describe('routeWithAI', () => {
  it('returns parsed decision on success', async () => {
    const server = await startServer((req, res) => {
      if (req.method === 'POST' && req.url === '/classify') {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ intent: 'support', confidence: 0.9, destination: { type: 'queue', id: 'support' }, modelVersion: 'x', promptId: 'y' }));
      } else {
        res.statusCode = 404; res.end();
      }
    });
    const out = await routeWithAI({ conversationId: 'c', content: 'help' }, { aiUrl: server.url, timeoutMs: 1000 });
    await server.close();
    expect(out.intent).toBe('support');
    expect(out.destination).toEqual({ type: 'queue', id: 'support' });
  });

  it('returns triage on timeout', async () => {
    const server = await startServer((req, res) => {
      setTimeout(() => { res.setHeader('content-type', 'application/json'); res.end('{}'); }, 2000);
    });
    const out = await routeWithAI({ conversationId: 'c', content: 'hi' }, { aiUrl: server.url, timeoutMs: 10 });
    await server.close();
    expect(out.destination).toEqual({ type: 'triage' });
  });
});

// removed dependency on server module to avoid side-effects during tests


