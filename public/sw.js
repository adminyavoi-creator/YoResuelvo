const CACHE = 'yo-resuelvo-shell-v5';
const SHELL = [
  '/', '/landing.html', '/privacy.html', '/terms.html', '/delete-account.html',
  '/site.css', '/manifest.webmanifest', '/pwa-register.js',
  '/brand/yoresuelvo-icon-192.png', '/brand/yoresuelvo-icon-512.png',
  '/images/reparaciones.jpg', '/images/plomeria.jpg', '/images/electricidad.jpg',
];
importScripts('/firebase-config.js');
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL))));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then(hit => {
    if (hit) return hit;
    return caches.match(new URL(event.request.url).pathname === '/' ? '/' : '/landing.html');
  })));
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
      body: notice.body || '', icon: '/brand/yoresuelvo-icon-512.png', badge: '/brand/yoresuelvo-icon-512.png', data,
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
