type Buckets = number[];
const httpBuckets: Buckets = [0.1, 0.5, 1, 1.5, 2, 5, 10];

const counters: Record<string, number> = Object.create(null);
const histBuckets: Record<string, number> = Object.create(null);
const histSum: Record<string, number> = Object.create(null);
const histCount: Record<string, number> = Object.create(null);

function format(labels: Record<string, string>): string {
  const ks = Object.keys(labels);
  if (ks.length === 0) return '';
  return `{${ks.map(k => `${k}="${labels[k]}"`).join(',')}}`;
}

export function incHttp(service: 'ai-bot', statusCode: number, durMs: number) {
  const status = String(statusCode);
  const base = { service };
  const cntKey = `http_requests_total${format({ ...base, status })}`;
  counters[cntKey] = (counters[cntKey] || 0) + 1;
  const sumKey = `http_request_duration_seconds${format(base)}_sum`;
  const countKey = `http_request_duration_seconds${format(base)}_count`;
  histSum[sumKey] = (histSum[sumKey] || 0) + durMs / 1000;
  histCount[countKey] = (histCount[countKey] || 0) + 1;
  for (const le of httpBuckets) {
    const bKey = `http_request_duration_seconds_bucket${format({ ...base, le: String(le) })}`;
    histBuckets[bKey] = (histBuckets[bKey] || 0) + ((durMs / 1000) <= le ? 1 : 0);
  }
  const infKey = `http_request_duration_seconds_bucket${format({ ...base, le: '+Inf' })}`;
  histBuckets[infKey] = (histBuckets[infKey] || 0) + 1;
}

export function dumpMetrics(): string {
  const out: string[] = [];
  for (const k of Object.keys(counters)) out.push(`${k} ${counters[k]}`);
  for (const k of Object.keys(histBuckets)) out.push(`${k} ${histBuckets[k]}`);
  for (const k of Object.keys(histSum)) out.push(`${k} ${histSum[k]}`);
  for (const k of Object.keys(histCount)) out.push(`${k} ${histCount[k]}`);
  return out.join('\n') + '\n';
}