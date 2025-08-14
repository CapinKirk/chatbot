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
  // simulate network drop mid-run
  for (let i = 0; i < 5; i++) {
    const body = JSON.stringify({ conversationId: conv.id, role: 'user', content: `hello ${i}`, clientGeneratedId: `${__ITER}@${i}` });
    const m = http.post(`${base}/messages`, body, { headers: { 'content-type': 'application/json' } });
    check(m, { 'msg ok': (r) => r.status === 200 });
    if (i === 2) sleep(10);
    else sleep(0.2);
  }
}


