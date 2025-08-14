import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 500,
  duration: '1m',
};

export default function () {
  const base = __ENV.API_URL || 'http://localhost:4000';
  const res = http.post(`${base}/conversations`, {});
  check(res, { 'conv created': (r) => r.status === 200 });
  const conv = res.json();
  for (let i = 0; i < 5; i++) {
    const m = http.post(`${base}/messages`, JSON.stringify({ conversationId: conv.id, role: 'user', content: `hello ${i}` }), { headers: { 'content-type': 'application/json' } });
    check(m, { 'msg ok': (r) => r.status === 200 });
    sleep(0.2);
  }
}


