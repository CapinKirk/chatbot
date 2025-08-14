import { describe, it, expect } from 'vitest';
import { ClassifyResponseSchema } from '../src/schemas';

describe('ClassifyResponseSchema', () => {
  it('accepts a valid response', () => {
    const sample = {
      intent: 'support',
      confidence: 0.9,
      // use triage to avoid UUID requirement here
      destination: { type: 'triage', id: null },
      modelVersion: 'rule-0.1',
      promptId: 'baseline-0',
      thresholds: { route: 0.72, unknown: 0.35 },
      latencyMs: 123,
      requestId: '11111111-1111-4111-8111-111111111111',
      traceId: '22222222-2222-4222-8222-222222222222',
      explanations: { features: ['keywords'], notes: 'rules' },
    } as const;
    const parsed = ClassifyResponseSchema.safeParse(sample);
    expect(parsed.success).toBe(true);
  });
});


