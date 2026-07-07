/* global importScripts, firebase */
// Service worker для фоновых push-уведомлений FCM.
// Конфиг Firebase передаётся query-параметрами при регистрации (см. services/pushNotification.js),
// потому что переменные окружения Vite недоступны внутри статичного service worker.

importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js');

const params = new URL(self.location).searchParams;

const firebaseConfig = {
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
};

if (firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Показываем уведомление, когда вкладка неактивна.
  messaging.onBackgroundMessage((payload) => {
    const notification = payload.notification || {};
    const title = notification.title || 'КупиДомой';
    self.registration.showNotification(title, {
      body: notification.body || '',
      icon: notification.icon || undefined,
      data: payload.data || {},
    });
  });
}

// Фокус/открытие приложения по клику на уведомление.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(self.registration.scope);
      }
      return undefined;
    }),
  );
});
