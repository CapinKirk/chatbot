// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - types may not be present in all environments
import webpush from 'web-push';

type Subscription = { endpoint: string; keys: { p256dh: string; auth: string } };

export function configureWebPushFromEnv() {
  const pub = process.env.WEB_PUSH_VAPID_PUBLIC_KEY || '';
  const priv = process.env.WEB_PUSH_VAPID_PRIVATE_KEY || '';
  if (pub && priv) {
    webpush.setVapidDetails('mailto:ops@example.com', pub, priv);
    return true;
  }
  return false;
}

export async function sendWebPush(subscription: Subscription, payload: any): Promise<boolean> {
  const enabled = configureWebPushFromEnv();
  if (!enabled) return false;
  try {
    await webpush.sendNotification(subscription as any, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}


