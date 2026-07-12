/* GET /firebase-messaging-sw.js — Firebase Cloud Messaging service worker.

   This SW handles background push notifications when the page is NOT in the
   foreground.  It must live at the root so its scope covers the entire site.

   We import the Firebase compat messaging library from the CDN so that
   background messages are displayed as native browser notifications even when
   the app tab is closed.  Foreground messages are handled in
   PwaRegistration.tsx via onMessage().

   IMPORTANT: This is served as a static-ISH route so the browser can cache it,
   but we set Cache-Control: max-age=0 to ensure updates are picked up quickly.
*/
export async function GET() {
  const sw = `
/* firebase-messaging-sw.js — PiForum FCM background push handler */
importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAzGFPRx4lL9kQPIgwmwyKaEOCUvO-KZ4Y',
  authDomain: 'piforumeuorg.firebaseapp.com',
  projectId: 'piforumeuorg',
  storageBucket: 'piforumeuorg.firebasestorage.app',
  messagingSenderId: '120994957797',
  appId: '1:120994957797:web:ce26d58ad7e40802a6470c',
});

const messaging = firebase.messaging();

// Handle background messages (when the app is NOT in the foreground)
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'PiForum';
  const body = payload.notification?.body || '';
  const icon = payload.notification?.icon || '/icon-192.png';
  const clickAction = payload.data?.link || payload.notification?.click_action || '/';

  const options = {
    body,
    icon,
    badge: '/icon-72.png',
    data: {
      click_action: clickAction,
    },
    vibrate: [200, 100, 200],
    tag: 'piforum-notification',
    renotify: true,
  };

  self.registration.showNotification(title, options);
});

// Handle notification click — open/focus the app window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.click_action || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // No window open — open a new one
      return self.clients.openWindow(targetUrl);
    })
  );
});
`;
  return new Response(sw, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Service-Worker-Allowed': '/',
    },
  });
}
