// GymTrackie Service Worker for iOS & Modern PWA Notifications

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle scheduled notification messages from client
let scheduledTimerTimeout = null;

self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    if (scheduledTimerTimeout) {
      clearTimeout(scheduledTimerTimeout);
      scheduledTimerTimeout = null;
    }
    const { delayMs, title, options } = event.data;
    if (typeof delayMs === 'number' && delayMs > 0) {
      scheduledTimerTimeout = setTimeout(() => {
        self.registration.showNotification(title || 'Ready for Next Set! 🏋️', options || {});
        scheduledTimerTimeout = null;
      }, delayMs);
    }
  } else if (event.data.type === 'CANCEL_NOTIFICATION') {
    if (scheduledTimerTimeout) {
      clearTimeout(scheduledTimerTimeout);
      scheduledTimerTimeout = null;
    }
  }
});

// Handle clicks on lock-screen or banner notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/workout');
      }
    })
  );
});

// Support incoming push events if configured
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'GymTrackie', {
        body: data.body || 'Ready for next set!',
        icon: data.icon || '/gymtrackie-icon.svg',
        badge: '/favicon.svg',
        tag: data.tag || 'gymtrackie-rest-notification',
      })
    );
  } catch {
    event.waitUntil(
      self.registration.showNotification('GymTrackie', {
        body: event.data.text(),
        icon: '/gymtrackie-icon.svg',
      })
    );
  }
});
