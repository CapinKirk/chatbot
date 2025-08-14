import { describe, it, expect } from 'vitest';
import { enqueueNotification, getMemoryNotificationJobs } from '../src/queue';

describe('queue', () => {
  it('stores jobs in memory when REDIS_URL not set', async () => {
    delete (process.env as any).REDIS_URL;
    const r = await enqueueNotification({ title: 't', body: 'b' });
    expect(r).toBe('stored');
    const items = getMemoryNotificationJobs();
    expect(items.length).toBeGreaterThan(0);
  });
});


