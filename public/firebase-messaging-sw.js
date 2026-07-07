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
  // Инициализируем messaging, чтобы SDK сам показал ОДНО уведомление для
  // notification-сообщений в фоне. Свой onBackgroundMessage с showNotification
  // НЕ добавляем — иначе уведомление задваивается (авто-показ SDK + наш вызов).
  firebase.messaging();
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
