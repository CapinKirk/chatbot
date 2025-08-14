import { ClassifyResponseSchema } from '@chat/shared';

export async function routeWithAI(
  msg: { conversationId: string; content: string },
  opts?: { aiUrl?: string; timeoutMs?: number }
) {
  const controller = new AbortController();
  const timeoutMs = opts?.timeoutMs ?? 2000;
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(opts?.aiUrl || 'http://localhost:4100/classify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: msg.content }),
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


