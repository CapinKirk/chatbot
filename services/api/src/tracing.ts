import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { SocketIoInstrumentation } from '@opentelemetry/instrumentation-socket.io';

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318';

const traceExporter = new OTLPTraceExporter({
	url: `${otlpEndpoint.replace(/\/$/, '')}/v1/traces`,
});

const sdk = new NodeSDK({
	traceExporter,
	instrumentations: [
		getNodeAutoInstrumentations({
			'@opentelemetry/instrumentation-fs': { enabled: false },
		}),
		new FastifyInstrumentation(),
		new HttpInstrumentation(),
		new UndiciInstrumentation(),
		new SocketIoInstrumentation(),
	],
});

sdk.start();

process.on('SIGTERM', () => {
	sdk.shutdown().finally(() => process.exit(0));
});