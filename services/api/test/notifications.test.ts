import { describe, it, expect } from 'vitest';
import { configureWebPushFromEnv, sendWebPush } from '../src/notifications';

describe('notifications', () => {
  it('does not enable when keys missing', () => {
    delete (process.env as any).WEB_PUSH_VAPID_PUBLIC_KEY;
    delete (process.env as any).WEB_PUSH_VAPID_PRIVATE_KEY;
    expect(configureWebPushFromEnv()).toBe(false);
  });

  it('sendWebPush returns false without config', async () => {
    const ok = await sendWebPush({ endpoint: 'https://x', keys: { p256dh: 'a', auth: 'b' } }, { title: 't' });
    expect(ok).toBe(false);
  });
});


