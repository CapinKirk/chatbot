self.__SW_VERSION__ = 'v1';

const CACHE = `chat-cache-${self.__SW_VERSION__}`;
const CORE = [ '/', '/sw.js' ];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then(c=> c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async ()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k=> k !== CACHE).map(k=> caches.delete(k)));
    await self.clients.claim();
  })());
});

const seenMessageIds = new Set();

self.addEventListener('push', (event) => {
  const data = (()=>{ try { return event.data.json(); } catch { return { title: 'New message', body: '' }; } })();
  const mid = data && data.data && data.data.messageId;
  if (mid && seenMessageIds.has(mid)) return;
  if (mid) seenMessageIds.add(mid);
  event.waitUntil(self.registration.showNotification(data.title || 'New message', {
    body: data.body || '',
    icon: '/icon.png',
    data: data.data || {}
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const cid = event.notification.data && event.notification.data.conversationId;
  event.waitUntil((async ()=>{
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const url = cid ? `/?c=${cid}` : '/';
    for (const client of all) {
      if ('focus' in client) { client.navigate(url); return client.focus(); }
    }
    return self.clients.openWindow(url);
  })());
});

self.addEventListener('fetch', (event) => {
  // Basic cache-first for core assets
  if (event.request.method !== 'GET') return;
  event.respondWith((async ()=>{
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const res = await fetch(event.request);
      const cache = await caches.open(CACHE);
      cache.put(event.request, res.clone());
      return res;
    } catch (e) {
      return cached || Response.error();
    }
  })());
});
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const data = (()=>{ try { return event.data.json(); } catch { return { title: 'New message', body: '' }; } })();
  event.waitUntil(self.registration.showNotification(data.title || 'New message', {
    body: data.body || '',
    icon: '/icon.png',
    data: data.data || {}
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/'));
});


