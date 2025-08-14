import client from 'prom-client';

export const registry = new client.Registry();
registry.setDefaultLabels({ service: 'ai-bot' });
client.collectDefaultMetrics({ register: registry });

export const httpRequestDurationSeconds = new client.Histogram({
	name: 'http_request_duration_seconds',
	help: 'HTTP request duration in seconds',
	labelNames: ['method', 'route', 'status_code'] as const,
	buckets: [0.05, 0.1, 0.2, 0.3, 0.6, 1, 2, 5],
	registers: [registry],
});

export const httpRequestCounter = new client.Counter({
	name: 'http_requests_total',
	help: 'Total HTTP requests',
	labelNames: ['method', 'route', 'status_code'] as const,
	registers: [registry],
});

export function metricsRoute(fastify: any) {
	fastify.get('/metrics', async (_req: any, reply: any) => {
		reply.header('content-type', registry.contentType);
		return registry.metrics();
	});
}