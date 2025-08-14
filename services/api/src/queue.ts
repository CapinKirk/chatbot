import { Queue, Worker, type QueueOptions, type JobsOptions } from 'bullmq';
import IORedis from 'ioredis';
import { sendWebPush } from './notifications';

type NotificationJob = { userId?: string; queueId?: string; title: string; body: string; data?: any };

const memoryJobs: NotificationJob[] = [];
let memInterval: NodeJS.Timer | null = null;

function getQueue(): Queue<NotificationJob> | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    const connection = new IORedis(url, { maxRetriesPerRequest: null });
    const opts: QueueOptions = { connection: { host: (connection as any).options.host, port: (connection as any).options.port, username: (connection as any).options.username, password: (connection as any).options.password, db: (connection as any).options.db } as any };
    return new Queue<NotificationJob>('notifications', opts);
  } catch {
    return null;
  }
}

export async function enqueueNotification(job: NotificationJob): Promise<'queued'|'stored'> {
  const q = getQueue();
  if (q) {
    const opts: JobsOptions = { removeOnComplete: true, removeOnFail: true };
    await q.add('notify', job, opts);
    return 'queued';
  }
  memoryJobs.push(job);
  return 'stored';
}

export function getMemoryNotificationJobs(): NotificationJob[] {
  return memoryJobs;
}

export function startNotificationProcessing() {
  const q = getQueue();
  if (q) {
    // Start a worker if redis is available
    // eslint-disable-next-line no-new
    new Worker<NotificationJob>(q.name, async (job) => {
      const payload = { title: job.data.title, body: job.data.body, data: job.data.data || {} };
      // Broadcast demo: no specific subscription here; in a full impl, resolve user subscriptions
      // This worker can be extended to fetch subs from DB.
      // For now, no-op; actual push is sent at route time.
      return payload;
    }, q.opts as any);
    return;
  }
  // In-memory: drain jobs periodically (no-op for now, placeholder to avoid dead queue)
  if (!memInterval) {
    memInterval = setInterval(() => {
      memoryJobs.splice(0, memoryJobs.length);
    }, 2000);
  }
}


