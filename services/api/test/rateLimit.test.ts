import { describe, it, expect } from 'vitest';
import { rateLimitOk } from '../src/rateLimit';

describe('rateLimit', () => {
  it('allows under limit and blocks over limit', () => {
    const ip = '1.2.3.4';
    const windowMs = 1000;
    const limit = 3;
    expect(rateLimitOk(ip, limit, windowMs)).toBe(true);
    expect(rateLimitOk(ip, limit, windowMs)).toBe(true);
    expect(rateLimitOk(ip, limit, windowMs)).toBe(true);
    expect(rateLimitOk(ip, limit, windowMs)).toBe(false);
  });
});


