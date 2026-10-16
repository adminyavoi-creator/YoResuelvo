const CACHE = 'yo-resuelvo-shell-v1';
const SHELL = ['/', '/manifest.webmanifest', '/logo.svg'];
importScripts('/firebase-config.js');
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL))));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then(hit => hit || caches.match('/'))));
});

const firebaseConfig = self.__YORESUELVO_FIREBASE__;
if (firebaseConfig?.apiKey && firebaseConfig?.messagingSenderId && firebaseConfig?.appId) {
  importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js');
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage(payload => {
    const data = payload.data || {};
    const notice = payload.notification || {};
    return self.registration.showNotification(notice.title || 'YoResuelvo!', {
      body: notice.body || '', icon: '/logo.svg', badge: '/logo.svg', data,
      tag: data.notification_id || 'yoresuelvo-update',
    });
  });
}

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data || {};
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    const target = clients.find(client => new URL(client.url).origin === self.location.origin);
    if (target) {
      target.postMessage({ type: 'yoresuelvo-push-open', data });
      return target.focus();
    }
    const screen = encodeURIComponent(data.screen || 'cuenta');
    return self.clients.openWindow(`/?screen=${screen}`);
  }));
});
