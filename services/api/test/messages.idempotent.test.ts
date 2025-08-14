import { describe, it, expect } from 'vitest';
import { addMessage, listMessages } from '../src/db';

describe('messages idempotency', () => {
  it('inserts once for same clientGeneratedId', async () => {
    const conversationId = '00000000-0000-4000-8000-000000000001';
    const clientGeneratedId = 'client-1';
    const m1 = await addMessage({ conversationId, role: 'user', content: 'hello', senderId: null, clientGeneratedId } as any);
    const m2 = await addMessage({ conversationId, role: 'user', content: 'hello', senderId: null, clientGeneratedId } as any);
    expect(m2.id).toBe(m1.id);
    const rows = await listMessages(conversationId);
    const matches = rows.filter(r => (r as any).clientGeneratedId === clientGeneratedId);
    expect(matches.length).toBe(1);
  });

  it('since filter returns only newer rows', async () => {
    const conversationId = '00000000-0000-4000-8000-000000000002';
    const m1 = await addMessage({ conversationId, role: 'user', content: 'one', senderId: null } as any);
    await new Promise(r => setTimeout(r, 5));
    const m2 = await addMessage({ conversationId, role: 'user', content: 'two', senderId: null } as any);
    const since = m1.createdAt;
    const rows = await listMessages(conversationId, since);
    expect(rows.find(r => r.id === m1.id)).toBeFalsy();
    expect(rows.find(r => r.id === m2.id)).toBeTruthy();
  });
});


