import { describe, it, expect } from 'vitest';
import { ClassifyResponseSchema } from '../src/schemas';

describe('ClassifyResponseSchema', () => {
  it('accepts a valid response', () => {
    const sample = {
      intent: 'support',
      confidence: 0.9,
      destination: { type: 'queue', id: 'support' },
      modelVersion: 'rule-0.1',
      promptId: 'baseline-0'
    };
    const parsed = ClassifyResponseSchema.safeParse(sample);
    expect(parsed.success).toBe(true);
  });
});


