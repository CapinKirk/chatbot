import './tracing';
import Fastify from 'fastify';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ClassifyRequestSchema } from '@chat/shared';
import { baseLogger, createRequestLogger } from './logger';
import { metricsRoute, httpRequestCounter, httpRequestDurationSeconds } from './metrics';

const app = Fastify({ logger: baseLogger });

metricsRoute(app);

app.addHook('onRequest', async (req, _reply) => {
	const requestId = (req.id as string) || cryptoRandomId();
	(req as any).log = createRequestLogger(requestId);
	(req as any)._startHrTime = process.hrtime.bigint();
});

app.addHook('onResponse', async (req, reply) => {
	const start = (req as any)._startHrTime as bigint | undefined;
	const durationSec = start ? Number(process.hrtime.bigint() - start) / 1e9 : 0;
	const route = (req.routerPath || req.url || 'unknown') as string;
	const labels = { method: req.method, route, status_code: String(reply.statusCode) } as const;
	httpRequestCounter.inc(labels);
	if (durationSec > 0) httpRequestDurationSeconds.observe(labels as any, durationSec);
});

app.get('/healthz', async () => {
	try {
		const testPath = path.join(process.cwd(), 'testset.json');
		const raw = await fs.readFile(testPath, 'utf8');
		const items: Array<{ text: string; intent: string }> = JSON.parse(raw);
		let tested = 0;
		let passed = 0;
		for (const it of items) {
			tested++;
			const guess = classifyIntent(it.text);
			if (guess.intent === it.intent) passed++;
		}
		const ok = passed / Math.max(1, tested) >= 0.9;
		return { ok, tested, passed };
	} catch (e) {
		return { ok: false, tested: 0, passed: 0 };
	}
});

app.post('/classify', async (req, reply) => {
	const parsed = ClassifyRequestSchema.safeParse((req as any).body);
	if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
	const res = classifyIntent(parsed.data.text);
	return res;
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4100;
app.listen({ port, host: '0.0.0.0' }).then(()=> app.log.info(`ai-bot listening on ${port}`));
function classifyIntent(input: string) {
	const text = input.toLowerCase();
	let intent: 'support'|'sales'|'billing'|'unknown' = 'unknown';
	if (/(bug|error|help|issue|crash|broken)/.test(text)) intent = 'support';
	else if (/(price|buy|quote|demo|sales)/.test(text)) intent = 'sales';
	else if (/(invoice|billing|charge|refund|receipt|payment)/.test(text)) intent = 'billing';
	const confidence = intent === 'unknown' ? 0.4 : 0.9;
	const destination = intent === 'unknown' ? { type:'triage' as const } : { type:'queue' as const, id:intent };
	return { intent, confidence, destination, modelVersion: 'rule-0.1', promptId: 'baseline-0' };
}

function cryptoRandomId() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}



