import http from 'k6/http';
import { check, sleep, group } from 'k6';

export const options = {
	vus: 25,
	duration: '1m',
	thresholds: {
		'http_req_duration{scenario:api_get}': ['p(95)<300'],
		'http_req_duration{scenario:api_post}': ['p(95)<600'],
		'http_req_duration{scenario:ai_bot}': ['p(95)<1500'],
		'http_req_duration{scenario:notify}': ['p(95)<2000'],
	},
	scenarios: {
		api_get: {
			executor: 'constant-vus', vus: 10, duration: '1m',
			exec: 'apiGet'
		},
		api_post: {
			executor: 'constant-vus', vus: 10, duration: '1m',
			startTime: '0s',
			exec: 'apiPost'
		},
		ai_bot: {
			executor: 'constant-vus', vus: 5, duration: '1m',
			startTime: '0s',
			exec: 'aiBot'
		},
		notify: {
			executor: 'constant-vus', vus: 3, duration: '1m',
			startTime: '0s',
			exec: 'notify'
		}
	}
};

const API = __ENV.API_URL || 'http://localhost:4000';
const AI = __ENV.AI_URL || 'http://localhost:4100';

export function apiGet() {
	const res = http.get(`${API}/healthz`);
	check(res, { 'status 200': r => r.status === 200 });
	sleep(0.2);
}

export function apiPost() {
	const payload = JSON.stringify({ conversationId: '00000000-0000-0000-0000-000000000001', role: 'user', content: 'I need help with billing' });
	const res = http.post(`${API}/messages`, payload, { headers: { 'content-type': 'application/json' } });
	check(res, { 'status 200or429': r => r.status === 200 || r.status === 429 });
	sleep(0.2);
}

export function aiBot() {
	const payload = JSON.stringify({ text: 'demo classify price?' });
	const res = http.post(`${AI}/classify`, payload, { headers: { 'content-type': 'application/json' } });
	check(res, { 'status 200': r => r.status === 200 });
	sleep(0.2);
}

export function notify() {
	const payload = JSON.stringify({ endpoint: `https://example.com/${Math.random()}`, keys: { p256dh: 'x', auth: 'y' } });
	const res = http.post(`${API}/push/subscribe`, payload, { headers: { 'content-type': 'application/json' } });
	check(res, { 'status 200or400': r => r.status === 200 || r.status === 400 });
	sleep(0.2);
}