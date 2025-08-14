import pino from 'pino';

export const baseLogger = pino({
	level: process.env.LOG_LEVEL || 'info',
	redact: {
		paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'token', 'apiKey'],
		remove: true,
	},
	formatters: {
		level(label) {
			return { level: label };
		},
	},
});

export function createRequestLogger(requestId: string) {
	return baseLogger.child({ requestId });
}