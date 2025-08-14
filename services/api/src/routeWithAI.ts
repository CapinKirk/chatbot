import { ClassifyResponseSchema } from '@chat/shared';

export async function routeWithAI(
  msg: { conversationId: string; content: string },
  opts?: { aiUrl?: string; timeoutMs?: number }
) {
  const controller = new AbortController();
  const timeoutMs = opts?.timeoutMs ?? 2000;
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Construct full classify request per shared schema
    const body = {
      messageId: cryptoRandomId(),
      conversationId: msg.conversationId,
      tenantId: process.env.TENANT_ID || '00000000-0000-4000-8000-000000000001',
      sender: { type: 'user', id: null },
      text: msg.content,
      lang: 'auto',
      contentType: 'text/plain',
      source: 'api',
      attachments: [],
      requestId: cryptoRandomId(),
      traceId: cryptoRandomId(),
      hints: { preferredIntents: [], priority: 'normal' },
    } as const;
    const res = await fetch(opts?.aiUrl || 'http://localhost:4100/classify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) throw new Error(`ai ${res.status}`);
    const data = await res.json();
    const parsed = ClassifyResponseSchema.safeParse(data);
    if (!parsed.success) throw new Error('bad ai response');
    return parsed.data;
  } catch (e) {
    return {
      intent: 'unknown' as const,
      confidence: 0,
      destination: { type: 'triage' as const },
      modelVersion: 'n/a',
      promptId: 'n/a',
    };
  }
}

export default routeWithAI;

function cryptoRandomId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}


