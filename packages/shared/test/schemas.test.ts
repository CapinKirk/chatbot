import { describe, it, expect } from 'vitest';
import { MessageSchema } from '../src/schemas';

describe('schemas', () => {
  it('validates a message', () => {
    const parsed = MessageSchema.safeParse({ conversationId: crypto.randomUUID(), role: 'user', content: 'hi' });
    expect(parsed.success).toBe(true);
  });
});


