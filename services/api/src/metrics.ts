type Buckets = number[];

const httpBuckets: Buckets = [0.1, 0.5, 1, 1.5, 2, 5, 10]; // seconds

const counters: Record<string, number> = Object.create(null);
const histBuckets: Record<string, number> = Object.create(null);
const histSum: Record<string, number> = Object.create(null);
const histCount: Record<string, number> = Object.create(null);

function incCounter(name: string, labels: Record<string, string>, by = 1): void {
  const key = `${name}${formatLabels(labels)}`;
  counters[key] = (counters[key] || 0) + by;
}

function observeHistogram(name: string, labels: Record<string, string>, buckets: Buckets, valSeconds: number): void {
  const base = `${name}${formatLabels(labels)}`;
  // Sum & count
  histSum[`${base}_sum`] = (histSum[`${base}_sum`] || 0) + valSeconds;
  histCount[`${base}_count`] = (histCount[`${base}_count`] || 0) + 1;
  // Buckets cumulative
  for (const le of buckets) {
    const bKey = `${name}_bucket${formatLabels({ ...labels, le: String(le) })}`;
    histBuckets[bKey] = (histBuckets[bKey] || 0) + (valSeconds <= le ? 1 : 0);
  }
  // +Inf bucket
  const infKey = `${name}_bucket${formatLabels({ ...labels, le: '+Inf' })}`;
  histBuckets[infKey] = (histBuckets[infKey] || 0) + 1;
}

function formatLabels(labels: Record<string, string>): string {
  const keys = Object.keys(labels);
  if (keys.length === 0) return '';
  const inner = keys.map(k => `${k}="${labels[k]}"`).join(',');
  return `{${inner}}`;
}

export function recordHttp(service: 'api' | 'ai-bot', statusCode: number, durationMs: number): void {
  const status = String(statusCode);
  incCounter('http_requests_total', { service, status });
  observeHistogram('http_request_duration_seconds', { service }, httpBuckets, durationMs / 1000);
}

export function recordNotificationResult(ok: boolean, durationMs: number): void {
  incCounter('notifications_total', { service: 'notifications', status: ok ? 'ok' : 'error' });
  observeHistogram('notifications_send_duration_seconds', { service: 'notifications' }, httpBuckets, durationMs / 1000);
}

export function metricsText(): string {
  const lines: string[] = [];
  // Counters
  for (const key of Object.keys(counters)) {
    lines.push(`${key} ${counters[key]}`);
  }
  // Histograms - buckets
  for (const key of Object.keys(histBuckets)) {
    lines.push(`${key} ${histBuckets[key]}`);
  }
  // Histograms - sum/count
  for (const key of Object.keys(histSum)) {
    lines.push(`${key} ${histSum[key]}`);
  }
  for (const key of Object.keys(histCount)) {
    lines.push(`${key} ${histCount[key]}`);
  }
  return lines.join('\n') + '\n';
}