import Fastify from 'fastify';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { z } from 'zod';
import { ClassifyRequestSchema, ClassifyResponseSchema, RouteDecisionSchema } from '@chat/shared';

const app = Fastify({ logger: true });

// ---------- Config ----------
const BOT_TEST_MODE = (process.env.BOT_TEST_MODE || 'false').toLowerCase() === 'true';
const BOT_SHADOW_MODE = (process.env.BOT_SHADOW_MODE || 'false').toLowerCase() === 'true';
const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS || '2000', 10);
const MAX_INFLIGHT = parseInt(process.env.MAX_INFLIGHT || '64', 10);
const MODEL_VERSION = process.env.MODEL_VERSION || 'rule:model@0';
const PROMPT_ID = process.env.PROMPT_ID || 'baseline-0';
const T_ROUTE = parseFloat(process.env.T_ROUTE || '0.72');
const T_UNKNOWN = parseFloat(process.env.T_UNKNOWN || '0.35');
if (!(T_ROUTE > T_UNKNOWN)) {
  throw new Error(`Invalid thresholds: T_ROUTE(${T_ROUTE}) must be > T_UNKNOWN(${T_UNKNOWN})`);
}

// ---------- Deterministic IDs for queues in test mode ----------
const QUEUE_IDS: Record<'support'|'sales'|'billing', string> = BOT_TEST_MODE ? {
  support: '11111111-1111-4111-8111-111111111111',
  sales: '22222222-2222-4222-8222-222222222222',
  billing: '33333333-3333-4333-8333-333333333333',
} : {
  support: crypto.randomUUID(),
  sales: crypto.randomUUID(),
  billing: crypto.randomUUID(),
};

// ---------- Metrics (simple Prometheus exposition) ----------
const counters = {
  bot_requests_total: 0,
  bot_success_total: 0,
  bot_timeout_total: 0,
  bot_error_total: 0,
  bot_unknown_total: 0,
};
let bot_inflight = 0;
let eval_accuracy = 0;
const latencyBuckets = [50, 100, 250, 500, 1000, 1500, 2000];
const latencyCounts = new Array(latencyBuckets.length + 1).fill(0); // last is +Inf

function observeLatency(ms: number) {
  let b = latencyBuckets.findIndex((t) => ms <= t);
  if (b === -1) b = latencyBuckets.length;
  latencyCounts[b]++;
}

function renderPrometheus(): string {
  const lines: string[] = [];
  lines.push('# HELP bot_requests_total Total classify requests');
  lines.push('# TYPE bot_requests_total counter');
  lines.push(`bot_requests_total ${counters.bot_requests_total}`);
  lines.push('# HELP bot_success_total Total successful decisions');
  lines.push('# TYPE bot_success_total counter');
  lines.push(`bot_success_total ${counters.bot_success_total}`);
  lines.push('# HELP bot_timeout_total Total timeouts');
  lines.push('# TYPE bot_timeout_total counter');
  lines.push(`bot_timeout_total ${counters.bot_timeout_total}`);
  lines.push('# HELP bot_error_total Total errors');
  lines.push('# TYPE bot_error_total counter');
  lines.push(`bot_error_total ${counters.bot_error_total}`);
  lines.push('# HELP bot_unknown_total Total unknown intent decisions');
  lines.push('# TYPE bot_unknown_total counter');
  lines.push(`bot_unknown_total ${counters.bot_unknown_total}`);
  lines.push('# HELP bot_latency_ms Request latency histogram');
  lines.push('# TYPE bot_latency_ms histogram');
  let cumulative = 0;
  for (let i = 0; i < latencyBuckets.length; i++) {
    cumulative += latencyCounts[i];
    lines.push(`bot_latency_ms_bucket{le="${latencyBuckets[i]}"} ${cumulative}`);
  }
  cumulative += latencyCounts[latencyBuckets.length];
  lines.push(`bot_latency_ms_bucket{le="+Inf"} ${cumulative}`);
  lines.push(`bot_latency_ms_count ${cumulative}`);
  // Approximate sum as bucket midpoints; optional, set to 0 if not tracked precisely
  lines.push(`bot_latency_ms_sum 0`);
  lines.push('# HELP bot_inflight Current in-flight requests');
  lines.push('# TYPE bot_inflight gauge');
  lines.push(`bot_inflight ${bot_inflight}`);
  lines.push('# HELP eval_accuracy Last cached smoke eval accuracy');
  lines.push('# TYPE eval_accuracy gauge');
  lines.push(`eval_accuracy ${eval_accuracy}`);
  return lines.join('\n');
}

// ---------- Idempotency cache ----------
type Cached = { response: any; createdAt: number };
const IDEMP_TTL_MS = 10 * 60 * 1000;
const idempotencyCache = new Map<string, Cached>();
function makeCacheKey(idempotencyKey: string, messageId: string) {
  return `${idempotencyKey}:${messageId}`;
}
function getCached(key: string): any | null {
  const c = idempotencyCache.get(key);
  if (!c) return null;
  if (Date.now() - c.createdAt > IDEMP_TTL_MS) {
    idempotencyCache.delete(key);
    return null;
  }
  return c.response;
}

// ---------- Utilities ----------
function redact(text: string): string {
  if (!text) return '';
  const truncated = text.slice(0, 64);
  // naive redactions
  return truncated.replace(/\b[\w.-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, '[redacted-email]')
                  .replace(/\b\d{13,19}\b/g, '[redacted-cc]')
                  .replace(/(sk-[A-Za-z0-9]{10,})/g, '[redacted-token]');
}

function nowMs() { return Date.now(); }

// ---------- Health cache ----------
let lastSmokeEval: { total: number; passed: number; accuracy: number } = { total: 0, passed: 0, accuracy: 0 };
let lastSmokeTs = 0;
const SMOKE_TTL_MS = 5 * 60 * 1000;

async function runSmokeEval(): Promise<typeof lastSmokeEval> {
  try {
    const testPathCandidates = [
      path.join(process.cwd(), 'services', 'ai-bot', 'testdata', 'smoke50.json'),
      path.join(process.cwd(), 'services', 'ai-bot', 'testset.json'),
      path.join(process.cwd(), 'testset.json'),
    ];
    let raw: string | null = null;
    for (const p of testPathCandidates) {
      try { raw = await fs.readFile(p, 'utf8'); break; } catch {}
    }
    if (!raw) throw new Error('smoke set not found');
    const items: Array<{ text: string; intent: 'support'|'sales'|'billing'|'unknown' }> = JSON.parse(raw);
    let passed = 0;
    for (const it of items) {
      const guess = classifyIntent(it.text);
      if (guess.intent === it.intent) passed++;
    }
    const total = items.length;
    const accuracy = total ? passed / total : 0;
    eval_accuracy = accuracy;
    return { total, passed, accuracy };
  } catch (e) {
    return { total: 0, passed: 0, accuracy: 0 };
  }
}

// Preload smoke on startup
(async () => {
  lastSmokeEval = await runSmokeEval();
  lastSmokeTs = Date.now();
})();

app.get('/healthz', async (req, reply) => {
  try {
    if (Date.now() - lastSmokeTs > SMOKE_TTL_MS) {
      lastSmokeEval = await runSmokeEval();
      lastSmokeTs = Date.now();
    }
    const status = lastSmokeEval.accuracy >= 0.85 ? 'ok' : 'fail';
    const body = { status, modelVersion: MODEL_VERSION, promptId: PROMPT_ID, smokeEval: lastSmokeEval, testsetPassRate: lastSmokeEval.accuracy };
    if (status === 'ok') return reply.code(200).send(body);
    return reply.code(500).send(body);
  } catch (e) {
    return reply.code(500).send({ status: 'fail', modelVersion: MODEL_VERSION, promptId: PROMPT_ID, smokeEval: { total: 0, passed: 0, accuracy: 0 }, testsetPassRate: 0 });
  }
});

app.get('/metrics', async (_req, reply) => {
  reply.header('content-type', 'text/plain; version=0.0.4');
  return reply.send(renderPrometheus());
});

// ---------- Classify route ----------
app.post('/classify', async (req, reply) => {
  const start = nowMs();
  if (bot_inflight >= MAX_INFLIGHT) {
    const retryAfterMs = BOT_TEST_MODE ? 250 : (100 + Math.floor(Math.random() * 401));
    reply.header('Retry-After', '1'); // seconds fallback
    reply.header('Retry-After-Ms', String(retryAfterMs));
    return reply.code(429).send({ error: 'too_many_requests' });
  }
  bot_inflight++;
  counters.bot_requests_total++;
  try {
    const rawBody: any = (req as any).body;
    if (rawBody?.text && typeof rawBody.text === 'string' && rawBody.text.length > 4000) {
      return reply.code(413).send({ error: 'payload_too_large' });
    }
    const parsed = ClassifyRequestSchema.safeParse(rawBody);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const body = parsed.data;
    const idempotencyKey = (req.headers['idempotency-key'] || '') as string;
    if (idempotencyKey) {
      const cacheKey = makeCacheKey(idempotencyKey, body.messageId);
      const cached = getCached(cacheKey);
      if (cached) {
        const latencyMs = nowMs() - start;
        observeLatency(latencyMs);
        return reply.code(200).send(cached);
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const decision = await classifyWithTimeout(body.text, { signal: controller.signal });
      const latencyMs = nowMs() - start;
      observeLatency(latencyMs);
      // Apply threshold policy: < T_UNKNOWN => unknown; >= T_ROUTE => route; between => triage as unknown
      let effectiveIntent = decision.intent as Intent;
      let reason: 'ok'|'low_confidence' = 'ok';
      if (decision.confidence < T_UNKNOWN) {
        effectiveIntent = 'unknown';
        reason = 'low_confidence';
      } else if (decision.confidence >= T_ROUTE) {
        // keep predicted intent unless it is unknown
        if (decision.intent === 'unknown') {
          reason = 'low_confidence';
        }
      } else {
        effectiveIntent = 'unknown';
        reason = 'low_confidence';
      }
      const destination = effectiveIntent === 'unknown'
        ? { type: 'triage' as const, id: null }
        : { type: 'queue' as const, id: QUEUE_IDS[effectiveIntent] };
      if (effectiveIntent === 'unknown') counters.bot_unknown_total++;
      const response = {
        intent: effectiveIntent,
        confidence: decision.confidence,
        destination,
        modelVersion: MODEL_VERSION,
        promptId: PROMPT_ID,
        thresholds: { route: T_ROUTE, unknown: T_UNKNOWN },
        latencyMs,
        requestId: body.requestId || crypto.randomUUID(),
        traceId: body.traceId || crypto.randomUUID(),
        explanations: BOT_TEST_MODE ? { features: ['keywords'], notes: 'rules' } : { features: [], notes: '' },
      };

      // Validate response shape strictly
      const valid = ClassifyResponseSchema.safeParse(response);
      if (!valid.success) {
        counters.bot_error_total++;
        return reply.code(500).send({ error: 'invalid_response' });
      }

      // Emit decision event (best effort)
      emitDecision({
        conversationId: body.conversationId,
        messageId: body.messageId,
        intent: response.intent,
        confidence: response.confidence,
        destinationType: response.destination.type,
        destinationId: response.destination.id,
        modelVersion: response.modelVersion,
        promptId: response.promptId,
        thresholdRoute: T_ROUTE,
        thresholdUnknown: T_UNKNOWN,
        mode: 'live',
        reason,
      });

      // Shadow mode: make parallel call and emit without affecting response
      if (BOT_SHADOW_MODE) {
        setTimeout(async () => {
          try {
            const s = await classifyWithTimeout(body.text, { signal: new AbortController().signal });
            emitDecision({
              conversationId: body.conversationId,
              messageId: body.messageId,
              intent: s.intent,
              confidence: s.confidence,
              destinationType: s.intent === 'unknown' ? 'triage' : 'queue',
              destinationId: s.intent === 'unknown' ? null : QUEUE_IDS[s.intent],
              modelVersion: MODEL_VERSION,
              promptId: PROMPT_ID,
              thresholdRoute: T_ROUTE,
              thresholdUnknown: T_UNKNOWN,
              mode: 'shadow',
              reason: s.intent === 'unknown' ? 'low_confidence' : 'ok',
            });
          } catch {}
        }, 0);
      }

      counters.bot_success_total++;
      if (idempotencyKey) {
        const cacheKey = makeCacheKey(idempotencyKey, body.messageId);
        idempotencyCache.set(cacheKey, { response, createdAt: Date.now() });
      }
      return reply.code(200).send(response);
    } catch (err: any) {
      clearTimeout(timeout);
      const latencyMs = nowMs() - start;
      observeLatency(latencyMs);
      if (err?.name === 'AbortError') {
        counters.bot_timeout_total++;
        const bodyAny: any = (req as any).body;
        // Record triage decision on timeout
        emitDecision({
          conversationId: bodyAny?.conversationId || crypto.randomUUID(),
          messageId: bodyAny?.messageId || crypto.randomUUID(),
          intent: 'unknown',
          confidence: 0,
          destinationType: 'triage',
          destinationId: null,
          modelVersion: MODEL_VERSION,
          promptId: PROMPT_ID,
          thresholdRoute: T_ROUTE,
          thresholdUnknown: T_UNKNOWN,
          mode: 'live',
          reason: 'timeout',
        });
        return reply.code(504).send({ error: 'timeout' });
      }
      counters.bot_error_total++;
      const bodyAny: any = (req as any).body;
      // Record triage decision on error
      emitDecision({
        conversationId: bodyAny?.conversationId || crypto.randomUUID(),
        messageId: bodyAny?.messageId || crypto.randomUUID(),
        intent: 'unknown',
        confidence: 0,
        destinationType: 'triage',
        destinationId: null,
        modelVersion: MODEL_VERSION,
        promptId: PROMPT_ID,
        thresholdRoute: T_ROUTE,
        thresholdUnknown: T_UNKNOWN,
        mode: 'live',
        reason: 'error',
      });
      return reply.code(500).send({ error: 'error' });
    } finally {
      clearTimeout(timeout);
    }
  } finally {
    bot_inflight--;
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4100;
app.listen({ port, host: '0.0.0.0' }).then(()=> app.log.info(`ai-bot listening on ${port}`));

// ---------- Classification ----------
type Intent = 'support'|'sales'|'billing'|'unknown';

async function classifyWithTimeout(text: string, opts: { signal: AbortSignal }): Promise<{ intent: Intent; confidence: number }> {
  // If provider configured, we could call external API respecting opts.signal. For now, rules + thresholds
  return classifyIntent(text);
}

function classifyIntent(input: string) {
  const text = (input || '').toLowerCase();
  let intent: Intent = 'unknown';
  if (/(bug|error|help|issue|crash|broken|password|login)/.test(text)) intent = 'support';
  else if (/(price|buy|quote|demo|sales|purchase|plan)/.test(text)) intent = 'sales';
  else if (/(invoice|billing|charge|refund|receipt|payment|credit)/.test(text)) intent = 'billing';
  const confidence = intent === 'unknown' ? 0.2 : 0.9;
  return { intent, confidence };
}

// ---------- Event emission ----------
async function emitDecision(decision: z.infer<typeof RouteDecisionSchema>) {
  const base = {
    tenantId: undefined,
  };
  const payload = { ...decision, modelVersion: MODEL_VERSION, promptId: PROMPT_ID } as any;
  try {
    // Placeholder: integrate with real message bus here if available
    app.log.info({ event: 'routing.decision.v1', payload });
  } catch (e) {
    // best effort
  }
}



