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


