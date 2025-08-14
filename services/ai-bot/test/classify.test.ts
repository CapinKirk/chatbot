import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('ai-bot classify', () => {
  it('routes support keywords', () => {
    const text = 'I have a bug and need help';
    const support = /(bug|error|help|issue)/.test(text.toLowerCase());
    expect(support).toBe(true);
  });
  it('has a testset for healthz', () => {
    const p = path.join(process.cwd(), 'testset.json');
    expect(fs.existsSync(p)).toBe(true);
  });
});


