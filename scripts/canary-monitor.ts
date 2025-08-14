#!/usr/bin/env tsx

import fetch from 'node-fetch';
import { Octokit } from '@octokit/rest';

/**
 * Canary monitor
 * - Polls metrics every 60s
 * - Evaluates error rate and P95 latency for api, ai-bot, notifications
 * - If any threshold exceeded for 5 consecutive minutes: set canary to 0, trigger rollback, comment on release PR
 * - If stable for 30 minutes: propose bump 5→50→100
 */

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || '';
const METRICS_ENDPOINTS = (process.env.DIRECT_METRICS_ENDPOINTS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean); // e.g. http://api:4000/metrics,http://ai:4100/metrics

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || '';
const RELEASE_PR_NUMBER = process.env.RELEASE_PR_NUMBER ? Number(process.env.RELEASE_PR_NUMBER) : undefined;

const SLO = {
  errorRate: Number(process.env.SLO_ERROR_RATE || '0.02'), // 2%
  p95LatencyMs: Number(process.env.SLO_P95_MS || '1500'), // 1.5s
};

const SERVICES = ['api', 'ai-bot', 'notifications'];

type Sample = { timestamp: number; errorRate: number; p95Ms: number };
const history: Record<string, Sample[]> = Object.fromEntries(SERVICES.map(s => [s, []]));

function now(): number { return Date.now(); }
function prune(): void {
  const cutoff = now() - 60 * 60 * 1000; // keep 1h
  for (const s of SERVICES) history[s] = history[s].filter(x => x.timestamp >= cutoff);
}

async function scrapeMetricsDirect(): Promise<Record<string, Sample>> {
  const results: Record<string, Sample> = {};
  for (const endpoint of METRICS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, { timeout: 5000 as any });
      if (!res.ok) continue;
      const text = await res.text();
      const m = parsePromText(text);
      const svc = inferServiceName(endpoint);
      if (!svc) continue;
      results[svc] = { timestamp: now(), errorRate: m.errorRate ?? 0, p95Ms: m.p95Ms ?? 0 };
    } catch {}
  }
  return results;
}

function inferServiceName(url: string): string | undefined {
  if (/api/i.test(url)) return 'api';
  if (/ai|bot/i.test(url)) return 'ai-bot';
  if (/notif/i.test(url)) return 'notifications';
  return undefined;
}

function parsePromText(text: string): { errorRate?: number; p95Ms?: number } {
  // Expect metrics names (customize as needed):
  // http_requests_total{status!~"2.."}
  // http_request_duration_seconds_bucket{le="0.95"}
  // For placeholder repo, fall back to zeros.
  const lines = text.split('\n');
  let errors = 0, total = 0;
  let p95Ms: number | undefined = undefined;
  for (const line of lines) {
    if (line.startsWith('#')) continue;
    if (/http_requests_total/.test(line)) {
      const val = Number(line.split(' ').pop());
      total += isFinite(val) ? val : 0;
      if (/status="5/.test(line) || /status="4/.test(line)) errors += isFinite(val) ? val : 0;
    }
    if (/http_request_duration_seconds_bucket\{.*le="1\.5"/.test(line)) {
      // crude approximation; in a real setup compute quantiles
      p95Ms = 1500;
    }
  }
  const errorRate = total > 0 ? errors / total : 0;
  return { errorRate, p95Ms };
}

async function queryPromQL(_svc: string): Promise<Sample | undefined> {
  if (!PROMETHEUS_URL) return undefined;
  try {
    // Placeholder queries, adjust to actual metric names
    const range = '5m';
    const er = await fetch(`${PROMETHEUS_URL}/api/v1/query?query=rate(http_requests_total{service="${_svc}",status!~"2.."}[${range}])/rate(http_requests_total{service="${_svc}"}[${range}])`);
    const erJson = await er.json();
    const errorRate = Number(erJson.data?.result?.[0]?.value?.[1] || 0);
    const p95 = await fetch(`${PROMETHEUS_URL}/api/v1/query?query=histogram_quantile(0.95,sum(rate(http_request_duration_seconds_bucket{service="${_svc}"}[${range}])) by (le))`);
    const p95Json = await p95.json();
    const p95Ms = Number(p95Json.data?.result?.[0]?.value?.[1] || 0) * 1000;
    return { timestamp: now(), errorRate, p95Ms };
  } catch {
    return undefined;
  }
}

function isViolation(samples: Sample[]): boolean {
  if (samples.length < 5) return false;
  const recent = samples.slice(-5);
  return recent.every(s => s.errorRate > SLO.errorRate || s.p95Ms > SLO.p95LatencyMs);
}

function isStable(samples: Sample[], minutes: number): boolean {
  const need = minutes;
  if (samples.length < need) return false;
  const recent = samples.slice(-need);
  return recent.every(s => s.errorRate <= SLO.errorRate && s.p95Ms <= SLO.p95LatencyMs);
}

async function setCanary(percent: number): Promise<void> {
  const api = process.env.API_ADMIN_URL || 'http://api:4000';
  const token = process.env.NEXTAUTH_SECRET || '';
  await fetch(`${api}/admin/flags/canary`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': token },
    body: JSON.stringify({ percent })
  });
}

async function getCanary(): Promise<number | undefined> {
  try {
    const api = process.env.API_ADMIN_URL || 'http://api:4000';
    const res = await fetch(`${api}/admin/flags/canary`);
    if (!res.ok) return undefined;
    const j = await res.json();
    return Number(j.canaryPercent);
  } catch {
    return undefined;
  }
}

async function triggerRollback(): Promise<void> {
  // Assumes a dedicated workflow_dispatch in deploy.yml named rollback
  const [owner, repo] = GITHUB_REPOSITORY.split('/');
  if (!GITHUB_TOKEN || !owner || !repo) return;
  const octokit = new Octokit({ auth: GITHUB_TOKEN });
  try {
    await octokit.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id: 'deploy.yml',
      ref: 'main',
      inputs: { action: 'rollback' as any }
    } as any);
  } catch {}
}

async function commentOnReleasePr(body: string): Promise<void> {
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY || !RELEASE_PR_NUMBER) return;
  const [owner, repo] = GITHUB_REPOSITORY.split('/');
  const octokit = new Octokit({ auth: GITHUB_TOKEN });
  try {
    await octokit.issues.createComment({ owner, repo, issue_number: RELEASE_PR_NUMBER, body });
  } catch {}
}

async function tick(): Promise<void> {
  prune();
  for (const svc of SERVICES) {
    const prom = await queryPromQL(svc);
    if (prom) history[svc].push(prom);
  }
  if (METRICS_ENDPOINTS.length) {
    const direct = await scrapeMetricsDirect();
    for (const [svc, sample] of Object.entries(direct)) history[svc].push(sample);
  }

  // Evaluate
  const anyViolation = SERVICES.some(svc => isViolation(history[svc]));
  const allStable30 = SERVICES.every(svc => isStable(history[svc], 30));

  if (anyViolation) {
    await setCanary(0);
    await triggerRollback();
    await commentOnReleasePr(`Auto-rollback triggered: SLO violation detected.\n- Error rate/p95 exceeded for 5 consecutive minutes.\n- Canary set to 0.\n`);
    process.exit(0);
  }

  // Progressive ramp-up
  const current = (await getCanary()) ?? 5;
  if (allStable30) {
    if (current < 50) {
      await setCanary(50);
      await commentOnReleasePr(`Canary ramp: stable for 30m. Proposing increase to 50%.`);
    } else if (current < 100) {
      await setCanary(100);
      await commentOnReleasePr(`Canary ramp: stable for 30m. Proposing increase to 100%.`);
      process.exit(0);
    }
  }
}

async function main() {
  // initial sample to seed
  await tick();
  setInterval(() => { tick().catch(()=>{}); }, 60_000);
}

main().catch(() => process.exit(1));