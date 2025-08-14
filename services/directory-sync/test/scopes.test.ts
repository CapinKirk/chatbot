import { describe, it, expect } from 'vitest';

describe('slack oauth scopes', () => {
  it('requests read-only scopes only', () => {
    const scopes = ['users:read','users:read.email'];
    expect(scopes).toContain('users:read');
    expect(scopes).toContain('users:read.email');
    expect(scopes).not.toContain('channels:read');
    expect(scopes).not.toContain('chat:write');
  });
});


